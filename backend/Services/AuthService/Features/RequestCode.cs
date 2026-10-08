using AgroConnect.AuthService.Models;
using AgroConnect.AuthService.Providers.Implementations;
using AgroConnect.AuthService.Providers.Interfaces;
using AgroConnect.Data.Entities;
using AgroConnect.Data.Persistence;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.SharedLibrary.Messages;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using AgroConnect.SharedLibrary.ValueObjects;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AgroConnect.AuthService.Features;

/// <summary>
/// "Send code": texts a 6-digit code to the phone. The answer is the same whether or not the number has an
/// account, so the screen cannot be used to find out who is registered.
/// </summary>
public sealed class RequestCode : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/code", Handle)
            .WithName("RequestCode")
            .WithTags("Auth")
            .AllowAnonymous()
            .RequireRateLimiting(AuthServiceExtension.RateLimitPolicy)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);
    }

    public static async Task<Accepted<RequestCodeResponse>> Handle(
        RequestCodeRequest request,
        AppDbContext db,
        ILoginCodeGenerator generator,
        ISmsSender sms,
        IMessageProvider messages,
        ISessionProvider session,
        IClock clock,
        IOptions<AuthOptions> options,
        CancellationToken cancellationToken)
    {
        if (!PhoneNumber.TryParse(request.Phone, out var phone))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "INVALID_PHONE");
        }

        var settings = options.Value;
        var now = clock.UtcNow;
        var hourAgo = now.AddHours(-1);
        var recent = await db.LoginCodes
            .Where(c => c.PhoneE164 == phone.E164 && c.Role == request.Role && c.CreatedAt > hourAgo)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => c.CreatedAt)
            .ToListAsync(cancellationToken);

        if (recent.Count > 0 && now - recent[0] < TimeSpan.FromSeconds(settings.ResendCooldownSeconds))
        {
            throw new ApiException(StatusCodes.Status429TooManyRequests, "RESEND_TOO_SOON");
        }

        if (recent.Count >= settings.MaxCodesPerHour)
        {
            throw new ApiException(StatusCodes.Status429TooManyRequests, "TOO_MANY_CODES");
        }

        var code = generator.NewCode();
        db.LoginCodes.Add(new LoginCode
        {
            Id = Guid.CreateVersion7(now),
            PhoneE164 = phone.E164,
            Role = request.Role,
            CodeHash = LoginCodeHasher.Hash(code, phone.E164, settings.SigningKey),
            CreatedAt = now,
            ExpiresAt = now.AddMinutes(settings.CodeLifetimeMinutes),
        });
        await db.SaveChangesAsync(cancellationToken);

        if (await HasAccountAsync(db, phone, request.Role, cancellationToken))
        {
            var sent = await sms.SendAsync(phone, messages.Get("LOGIN_CODE_SMS", session.Language, code), cancellationToken);
            if (sent.Outcome == SmsOutcome.Failed)
            {
                throw new ApiException(StatusCodes.Status503ServiceUnavailable, "SMS_UNAVAILABLE");
            }
        }

        return TypedResults.Accepted(
            (string?)null,
            new RequestCodeResponse(settings.ResendCooldownSeconds, settings.CodeLifetimeMinutes * 60));
    }

    /// <summary>Officers and admins need an account made for them; a farmer needs a farmer record with this phone.</summary>
    private static Task<bool> HasAccountAsync(AppDbContext db, PhoneNumber phone, UserRole role, CancellationToken cancellationToken) =>
        role == UserRole.Farmer
            ? db.Farmers.AnyAsync(f => f.PhoneE164 == phone.E164, cancellationToken)
            : db.Users.AnyAsync(u => u.PhoneE164 == phone.E164 && u.Role == role, cancellationToken);
}
