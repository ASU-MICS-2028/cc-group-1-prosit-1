using AgroConnect.Data.Entities;
using AgroConnect.Data.Persistence;
using AgroConnect.HelpService.Models;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using AgroConnect.SharedLibrary.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AgroConnect.HelpService.Features;

/// <summary>Shared rules for help requests (ADR 0035).</summary>
internal static class Help
{
    /// <summary>A question waiting longer than this is "overdue": the admin's Help desk shows it first.</summary>
    public static readonly TimeSpan OverdueAfter = TimeSpan.FromHours(24);

    public const int MaxText = 1000;
    public const int MaxAnswer = 2000;
    public const int MaxVoiceBytes = 1_500_000;

    private static readonly string[] VoiceTypes = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/aac"];

    public static bool IsOpen(HelpStatus status) => status is HelpStatus.Waiting or HelpStatus.StillNeedsHelp;

    public static bool IsOverdue(HelpRequest r, DateTimeOffset now) =>
        IsOpen(r.Status) && now - (r.Status == HelpStatus.StillNeedsHelp ? r.UpdatedAt : r.CreatedAt) > OverdueAfter;

    public static async Task<Farmer> FarmerAsync(AppDbContext db, ISessionProvider session, CancellationToken cancellationToken)
    {
        var farmerId = session.FarmerId ?? throw new ApiException(StatusCodes.Status403Forbidden, "NOT_A_FARMER_ACCOUNT");
        return await db.Farmers.AsNoTracking().FirstOrDefaultAsync(f => f.Id == farmerId, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "FARMER_NOT_FOUND");
    }

    public static async Task<AppUser> UserAsync(AppDbContext db, ISessionProvider session, UserRole role, CancellationToken cancellationToken)
    {
        var userId = session.RequireUserId();
        return await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId && u.Role == role, cancellationToken)
            ?? throw new ApiException(
                StatusCodes.Status403Forbidden,
                role == UserRole.Admin ? "NOT_AN_ADMIN_ACCOUNT" : "NOT_AN_OFFICER_ACCOUNT");
    }

    /// <summary>Officers the admin looks after: same region (and district when the admin has one); none set = national.</summary>
    public static IQueryable<AppUser> OfficersOf(this AppDbContext db, AppUser admin) =>
        db.Users.AsNoTracking().Where(u =>
            u.Role == UserRole.Officer
            && (admin.Region == null || u.Region == admin.Region)
            && (admin.District == null || u.District == admin.District));

    /// <summary>Officers' and farmers' names for a list of requests, in two queries.</summary>
    public static async Task<List<RequestItem>> ItemsAsync(
        AppDbContext db, IReadOnlyCollection<HelpRequest> requests, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var farmerIds = requests.Select(r => r.FarmerId).Distinct().ToList();
        var officerIds = requests.Where(r => r.OfficerId != null).Select(r => r.OfficerId!.Value).Distinct().ToList();
        var farmers = await db.Farmers.AsNoTracking().Where(f => farmerIds.Contains(f.Id))
            .ToDictionaryAsync(f => f.Id, f => new { f.FullName, f.Community }, cancellationToken);
        var officers = await db.Users.AsNoTracking().Where(u => officerIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);
        return requests.Select(r => new RequestItem(
            r.Id,
            r.FarmerId,
            farmers.TryGetValue(r.FarmerId, out var f) ? f.FullName : "",
            farmers.TryGetValue(r.FarmerId, out var g) ? g.Community : null,
            r.Category,
            r.Text,
            r.Crop,
            r.Problem,
            r.HasVoiceNote,
            r.VoiceSeconds,
            r.Status,
            r.OfficerId,
            r.OfficerId is { } o && officers.TryGetValue(o, out var name) ? name : null,
            r.Answer,
            IsOverdue(r, now),
            r.CreatedAt,
            r.AnsweredAt,
            r.RemindedAt)).ToList();
    }

    public static string? Clean(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();

    public static (string Type, byte[] Audio)? ReadVoiceNote(string? base64, string? type)
    {
        if (string.IsNullOrWhiteSpace(base64))
        {
            return null;
        }

        var contentType = (type ?? "").Split(';')[0].Trim().ToLowerInvariant();
        if (!VoiceTypes.Contains(contentType))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "VOICE_NOTE_INVALID");
        }

        try
        {
            var audio = Convert.FromBase64String(base64);
            return audio.Length is > 0 and <= MaxVoiceBytes
                ? (contentType, audio)
                : throw new ApiException(StatusCodes.Status400BadRequest, "VOICE_NOTE_INVALID");
        }
        catch (FormatException)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "VOICE_NOTE_INVALID");
        }
    }

    public static RouteHandlerBuilder Describe(this RouteHandlerBuilder route, string name, string policy) =>
        route.WithName(name)
            .WithTags("Help")
            .RequireAuthorization(policy)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);
}

// ---------- The farmer ----------

/// <summary>POST /api/help/requests: the farmer asks their officer (text, a voice note, or both).</summary>
public sealed class AskForHelp : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/help/requests", Handle).Describe("AskForHelp", AuthPolicies.Farmer);

    public static async Task<Ok<HelpRequestInfo>> Handle(
        AskRequest request, AppDbContext db, ISessionProvider session, IClock clock, CancellationToken cancellationToken)
    {
        var farmer = await Help.FarmerAsync(db, session, cancellationToken);
        var text = Help.Clean(request.Text);
        if (text?.Length > Help.MaxText)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "HELP_TOO_LONG");
        }

        var voice = Help.ReadVoiceNote(request.VoiceNoteBase64, request.VoiceNoteType);
        var problem = Help.Clean(request.Problem);
        if (text is null && voice is null && problem is null)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "HELP_EMPTY");
        }

        var now = clock.UtcNow;
        var help = new HelpRequest
        {
            Id = Guid.CreateVersion7(now),
            FarmerId = farmer.Id,
            OfficerId = farmer.RegisteredById,
            Category = request.Category,
            Text = text,
            Crop = request.Crop,
            Problem = problem?.Length > 50 ? problem[..50] : problem,
            HasVoiceNote = voice is not null,
            VoiceSeconds = voice is null ? null : Math.Clamp(request.VoiceSeconds ?? 0, 0, 600),
            Status = HelpStatus.Waiting,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.HelpRequests.Add(help);
        if (voice is { } v)
        {
            db.HelpVoiceNotes.Add(new HelpVoiceNote { HelpRequestId = help.Id, ContentType = v.Type, Audio = v.Audio });
        }

        await db.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok(await InfoAsync(db, help, cancellationToken));
    }

    internal static async Task<HelpRequestInfo> InfoAsync(AppDbContext db, HelpRequest r, CancellationToken cancellationToken)
    {
        var officer = r.OfficerId is null
            ? null
            : await db.Users.AsNoTracking().Where(u => u.Id == r.OfficerId).Select(u => u.FullName).FirstOrDefaultAsync(cancellationToken);
        return new HelpRequestInfo(
            r.Id, r.Category, r.Text, r.Crop, r.Problem, r.HasVoiceNote, r.VoiceSeconds, r.Status,
            officer, r.Answer, r.AnsweredAt, r.CreatedAt);
    }
}

/// <summary>GET /api/help/requests: the farmer's own questions, newest first.</summary>
public sealed class GetMyHelpRequests : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/help/requests", Handle).Describe("GetMyHelpRequests", AuthPolicies.Farmer);

    public static async Task<Ok<List<HelpRequestInfo>>> Handle(
        AppDbContext db, ISessionProvider session, CancellationToken cancellationToken)
    {
        var farmer = await Help.FarmerAsync(db, session, cancellationToken);
        var requests = await db.HelpRequests.AsNoTracking()
            .Where(r => r.FarmerId == farmer.Id)
            .OrderByDescending(r => r.CreatedAt)
            .Take(30)
            .ToListAsync(cancellationToken);
        var list = new List<HelpRequestInfo>();
        foreach (var r in requests)
        {
            list.Add(await AskForHelp.InfoAsync(db, r, cancellationToken));
        }

        return TypedResults.Ok(list);
    }
}

/// <summary>POST /api/help/requests/{id}/feedback: did the answer help? No sends it back to the officer.</summary>
public sealed class GiveHelpFeedback : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/help/requests/{id:guid}/feedback", Handle).Describe("GiveHelpFeedback", AuthPolicies.Farmer);

    public static async Task<Ok<HelpRequestInfo>> Handle(
        Guid id, FeedbackRequest request, AppDbContext db, ISessionProvider session, IClock clock, CancellationToken cancellationToken)
    {
        var farmer = await Help.FarmerAsync(db, session, cancellationToken);
        var help = await db.HelpRequests.FirstOrDefaultAsync(r => r.Id == id && r.FarmerId == farmer.Id, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "HELP_NOT_FOUND");
        if (help.Status is not (HelpStatus.Answered or HelpStatus.Solved))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "HELP_NOT_ANSWERED");
        }

        help.Status = request.Helped ? HelpStatus.Solved : HelpStatus.StillNeedsHelp;
        help.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok(await AskForHelp.InfoAsync(db, help, cancellationToken));
    }
}

/// <summary>
/// GET /api/help/requests/{id}/voice: the recording, for the farmer who sent it, the officer it is with, or an
/// admin. Fetched with the sign-in token, then played in the app.
/// </summary>
public sealed class GetHelpVoiceNote : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/help/requests/{id:guid}/voice", Handle)
            .WithName("GetHelpVoiceNote")
            .WithTags("Help")
            .RequireAuthorization()
            .Produces(StatusCodes.Status200OK, contentType: "audio/webm")
            .ProducesProblem(StatusCodes.Status404NotFound);

    public static async Task<IResult> Handle(
        Guid id, AppDbContext db, ISessionProvider session, CancellationToken cancellationToken)
    {
        var help = await db.HelpRequests.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "HELP_NOT_FOUND");
        var allowed = session.FarmerId == help.FarmerId;
        if (!allowed)
        {
            var userId = session.RequireUserId();
            var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
            allowed = user is not null
                && ((user.Role == UserRole.Officer && help.OfficerId == user.Id) || user.Role == UserRole.Admin);
        }

        var note = allowed
            ? await db.HelpVoiceNotes.AsNoTracking().FirstOrDefaultAsync(n => n.HelpRequestId == id, cancellationToken)
            : null;
        return note is null
            ? throw new ApiException(StatusCodes.Status404NotFound, "HELP_NOT_FOUND")
            : TypedResults.File(note.Audio, note.ContentType);
    }
}

// ---------- The officer ----------

/// <summary>GET /api/officer/requests: questions from the officer's farmers, open ones first.</summary>
public sealed class GetOfficerRequests : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/officer/requests", Handle).Describe("GetOfficerRequests", AuthPolicies.Officer);

    public static async Task<Ok<OfficerRequests>> Handle(
        AppDbContext db, ISessionProvider session, IClock clock, CancellationToken cancellationToken)
    {
        var officer = await Help.UserAsync(db, session, UserRole.Officer, cancellationToken);
        var requests = await db.HelpRequests.AsNoTracking()
            .Where(r => r.OfficerId == officer.Id)
            .OrderByDescending(r => r.CreatedAt)
            .Take(100)
            .ToListAsync(cancellationToken);
        var ordered = requests.OrderBy(r => Help.IsOpen(r.Status) ? 0 : 1).ThenByDescending(r => r.CreatedAt).ToList();
        var items = await Help.ItemsAsync(db, ordered, clock.UtcNow, cancellationToken);
        return TypedResults.Ok(new OfficerRequests(ordered.Count(r => Help.IsOpen(r.Status)), items));
    }
}

/// <summary>POST /api/officer/requests/{id}/answer: the officer's advice, sent to the farmer.</summary>
public sealed class AnswerRequestFeature : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/officer/requests/{id:guid}/answer", Handle).Describe("AnswerHelpRequest", AuthPolicies.Officer);

    public static async Task<Ok<RequestItem>> Handle(
        Guid id,
        AnswerRequest request,
        AppDbContext db,
        ISessionProvider session,
        IClock clock,
        ILogger<AnswerRequestFeature> logger,
        CancellationToken cancellationToken)
    {
        var officer = await Help.UserAsync(db, session, UserRole.Officer, cancellationToken);
        var advice = Help.Clean(request.Advice) ?? throw new ApiException(StatusCodes.Status400BadRequest, "ANSWER_REQUIRED");
        if (advice.Length > Help.MaxAnswer)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "ANSWER_TOO_LONG");
        }

        var help = await db.HelpRequests.FirstOrDefaultAsync(r => r.Id == id && r.OfficerId == officer.Id, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "HELP_NOT_FOUND");
        var now = clock.UtcNow;
        help.Answer = advice;
        help.AnsweredById = officer.Id;
        help.AnsweredAt = now;
        help.Status = HelpStatus.Answered;
        help.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
        // The SMS to the farmer goes out once the SMS provider is connected (ADR 0022); until then it is logged.
        logger.LogInformation("Help request {Id} answered; SMS to the farmer is pending the SMS provider", help.Id);
        return TypedResults.Ok((await Help.ItemsAsync(db, [help], now, cancellationToken))[0]);
    }
}

// ---------- The MoFA admin ----------

/// <summary>GET /api/admin/help-desk: every question in the admin's area, overdue first, and the officers' loads.</summary>
public sealed class GetHelpDesk : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/admin/help-desk", Handle).Describe("GetHelpDesk", AuthPolicies.Admin);

    public static async Task<Ok<HelpDesk>> Handle(
        AppDbContext db, ISessionProvider session, IClock clock, CancellationToken cancellationToken)
    {
        var admin = await Help.UserAsync(db, session, UserRole.Admin, cancellationToken);
        var now = clock.UtcNow;
        var officers = await db.OfficersOf(admin).Select(u => new { u.Id, u.FullName, u.District }).ToListAsync(cancellationToken);
        var ids = officers.Select(o => o.Id).ToList();
        var region = admin.Region;
        var requests = await db.HelpRequests.AsNoTracking()
            .Where(r => (r.OfficerId != null && ids.Contains(r.OfficerId.Value))
                || (r.OfficerId == null && db.Farmers.Any(f => f.Id == r.FarmerId
                    && (region == null || (f.RegionDistrict != null && f.RegionDistrict.StartsWith(region))))))
            .OrderByDescending(r => r.CreatedAt)
            .Take(200)
            .ToListAsync(cancellationToken);
        var ordered = requests
            .OrderBy(r => Help.IsOverdue(r, now) ? 0 : Help.IsOpen(r.Status) ? 1 : 2)
            .ThenBy(r => r.CreatedAt)
            .ToList();
        var items = await Help.ItemsAsync(db, ordered, now, cancellationToken);
        var loads = officers
            .Select(o => new OfficerLoad(o.Id, o.FullName, o.District, requests.Count(r => r.OfficerId == o.Id && Help.IsOpen(r.Status))))
            .OrderBy(o => o.Open)
            .ToList();
        return TypedResults.Ok(new HelpDesk(
            requests.Count(r => Help.IsOpen(r.Status)),
            requests.Count(r => Help.IsOverdue(r, now)),
            requests.Count(r => !Help.IsOpen(r.Status)),
            items,
            loads));
    }
}

/// <summary>POST /api/admin/help-desk/{id}/reassign: gives the question to another officer in the area.</summary>
public sealed class ReassignHelpRequest : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/admin/help-desk/{id:guid}/reassign", Handle).Describe("ReassignHelpRequest", AuthPolicies.Admin);

    public static async Task<Ok<RequestItem>> Handle(
        Guid id, ReassignRequest request, AppDbContext db, ISessionProvider session, IClock clock, CancellationToken cancellationToken)
    {
        var admin = await Help.UserAsync(db, session, UserRole.Admin, cancellationToken);
        if (!await db.OfficersOf(admin).AnyAsync(u => u.Id == request.OfficerId, cancellationToken))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "OFFICER_NOT_IN_AREA");
        }

        var help = await db.HelpRequests.FirstOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "HELP_NOT_FOUND");
        var now = clock.UtcNow;
        help.OfficerId = request.OfficerId;
        help.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok((await Help.ItemsAsync(db, [help], now, cancellationToken))[0]);
    }
}

/// <summary>POST /api/admin/help-desk/{id}/remind: reminds the officer (by SMS once connected; logged until then).</summary>
public sealed class RemindOfficer : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/admin/help-desk/{id:guid}/remind", Handle).Describe("RemindOfficer", AuthPolicies.Admin);

    public static async Task<Ok<RequestItem>> Handle(
        Guid id, AppDbContext db, ISessionProvider session, IClock clock, ILogger<RemindOfficer> logger, CancellationToken cancellationToken)
    {
        await Help.UserAsync(db, session, UserRole.Admin, cancellationToken);
        var help = await db.HelpRequests.FirstOrDefaultAsync(r => r.Id == id && r.OfficerId != null, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "HELP_NOT_FOUND");
        var now = clock.UtcNow;
        help.RemindedAt = now;
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Officer {Officer} reminded about help request {Id}", help.OfficerId, help.Id);
        return TypedResults.Ok((await Help.ItemsAsync(db, [help], now, cancellationToken))[0]);
    }
}
