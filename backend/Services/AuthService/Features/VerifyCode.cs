using AgroConnect.AuthService.Models;
using AgroConnect.AuthService.Providers.Implementations;
using AgroConnect.AuthService.Providers.Interfaces;
using AgroConnect.Data.Entities;
using AgroConnect.Data.Persistence;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Features;
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
/// "Enter code": checks the latest code for the phone and, if it matches, signs the person in.
/// A farmer's account is made on first sign-in from the record an officer registered.
/// </summary>
public sealed class VerifyCode : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/verify", Handle)
            .WithName("VerifyCode")
            .WithTags("Auth")
            .AllowAnonymous()
            .RequireRateLimiting(AuthServiceExtension.RateLimitPolicy)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);
    }

    public static async Task<Ok<AuthResponse>> Handle(
        VerifyCodeRequest request,
        AppDbContext db,
        ITokenIssuer tokens,
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
        var login = await db.LoginCodes
            .Where(c => c.PhoneE164 == phone.E164 && c.Role == request.Role && c.UsedAt == null)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (login is null || login.ExpiresAt <= now)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "CODE_EXPIRED");
        }

        if (login.Attempts >= settings.MaxAttempts)
        {
            throw new ApiException(StatusCodes.Status429TooManyRequests, "TOO_MANY_ATTEMPTS");
        }

        var code = request.Code?.Trim() ?? string.Empty;
        if (!LoginCodeHasher.Matches(code, phone.E164, settings.SigningKey, login.CodeHash))
        {
            login.Attempts++;
            await db.SaveChangesAsync(cancellationToken);
            throw new ApiException(StatusCodes.Status400BadRequest, "CODE_WRONG");
        }

        // A code was stored even when no account exists (so "Send code" reveals nothing); such a code
        // was never texted, so the same "wrong code" answer is correct here.
        var user = await FindOrCreateUserAsync(db, phone, request.Role, now, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status400BadRequest, "CODE_WRONG");

        login.UsedAt = now;
        await db.SaveChangesAsync(cancellationToken);

        var token = tokens.Issue(user);
        return TypedResults.Ok(new AuthResponse(token.Value, token.ExpiresAt, MeResponse.From(user)));
    }

    private static async Task<AppUser?> FindOrCreateUserAsync(
        AppDbContext db, PhoneNumber phone, UserRole role, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.PhoneE164 == phone.E164 && u.Role == role, cancellationToken);
        if (user is not null || role == UserRole.Officer)
        {
            return user;
        }

        // Family members can share one phone; the first person registered on it owns the farmer sign-in.
        var farmer = await db.Farmers
            .Where(f => f.PhoneE164 == phone.E164)
            .OrderBy(f => f.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (farmer is null)
        {
            return null;
        }

        user = new AppUser
        {
            Id = Guid.CreateVersion7(now),
            Role = UserRole.Farmer,
            PhoneE164 = phone.E164,
            FullName = farmer.FullName,
            Region = farmer.RegionDistrict,
            FarmerId = farmer.Id,
            CreatedAt = now,
        };
        db.Users.Add(user);
        return user;
    }
}
