using AgroConnect.Data.Entities;
using AgroConnect.Data.Persistence;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.SharedLibrary.Messages;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using AgroConnect.SharedLibrary.Security;
using AgroConnect.SharedLibrary.ValueObjects;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace AgroConnect.AdminService.Features;

/// <param name="Role">"officer" or "admin"; farmers are registered by their officer instead.</param>
/// <param name="Phone">Typed the way people write it ("024 000 0000").</param>
/// <param name="Region">Empty means the admin's own region.</param>
/// <param name="District">Needed for an officer. Empty for an admin means the whole region.</param>
public sealed record AddPersonRequest(UserRole Role, string FullName, string Phone, string? Region, string? District);

/// <summary>The new account, and what happened to the SMS invite: "sent", "logged" (SMS is off on this server) or "failed".</summary>
public sealed record AddPersonResponse(Guid Id, SmsOutcome Invite);

/// <summary>
/// POST /api/admin/people: an admin adds an extension officer or another admin in their own area and texts
/// them an invite (ADR 0024). The account is kept even when the SMS does not go; the answer says so.
/// </summary>
public sealed class AddPerson : IFeature
{
    private const int MaxLength = 100;

    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/admin/people", Handle)
            .WithName("AddPerson")
            .WithTags("Admin")
            .RequireAuthorization(AuthPolicies.Admin)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status409Conflict);

    public static async Task<Ok<AddPersonResponse>> Handle(
        AddPersonRequest request,
        AppDbContext db,
        ISessionProvider session,
        ISmsSender sms,
        IMessageProvider messages,
        IClock clock,
        CancellationToken cancellationToken)
    {
        var admin = await CurrentAdmin.LoadAsync(db, session, cancellationToken);
        if (request.Role is not (UserRole.Officer or UserRole.Admin))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "ROLE_NOT_ALLOWED");
        }

        var name = Clean(request.FullName) ?? throw new ApiException(StatusCodes.Status400BadRequest, "NAME_REQUIRED");
        if (!PhoneNumber.TryParse(request.Phone, out var phone))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "INVALID_PHONE");
        }

        var region = InArea(admin.Region, Clean(request.Region))
            ?? throw new ApiException(StatusCodes.Status400BadRequest, "REGION_REQUIRED");
        var district = InArea(admin.District, Clean(request.District));
        if (request.Role == UserRole.Officer && district is null)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "DISTRICT_REQUIRED");
        }

        if (await db.Users.AnyAsync(u => u.PhoneE164 == phone.E164 && u.Role == request.Role, cancellationToken))
        {
            throw new ApiException(StatusCodes.Status409Conflict, "PHONE_TAKEN");
        }

        var now = clock.UtcNow;
        var person = new AppUser
        {
            Id = Guid.CreateVersion7(now),
            Role = request.Role,
            PhoneE164 = phone.E164,
            FullName = name,
            Region = region,
            District = district,
            CreatedAt = now,
        };
        db.Users.Add(person);
        await db.SaveChangesAsync(cancellationToken);

        // In English: the new person's language is not known yet, and MoFA staff work in English.
        var key = request.Role == UserRole.Admin ? "INVITE_ADMIN_SMS" : "INVITE_OFFICER_SMS";
        var invite = await sms.SendAsync(phone, messages.Get(key, Language.English, name, admin.FullName), cancellationToken);
        return TypedResults.Ok(new AddPersonResponse(person.Id, invite.Outcome));
    }

    /// <summary>Trimmed, null when empty; too long for the database is a 400, not a 500.</summary>
    private static string? Clean(string? value)
    {
        var text = value?.Trim();
        if (text?.Length > MaxLength)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "TOO_LONG", MaxLength);
        }

        return string.IsNullOrEmpty(text) ? null : text;
    }

    /// <summary>
    /// The admin's own region (or district) when they have one: empty takes it, anything else is outside their
    /// area. A national admin (none) may pick any.
    /// </summary>
    private static string? InArea(string? adminArea, string? asked)
    {
        if (adminArea is null || asked is null || string.Equals(adminArea, asked, StringComparison.OrdinalIgnoreCase))
        {
            return adminArea ?? asked;
        }

        throw new ApiException(StatusCodes.Status403Forbidden, "OUTSIDE_YOUR_AREA", adminArea);
    }
}
