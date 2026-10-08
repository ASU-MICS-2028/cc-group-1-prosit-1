using AgroConnect.AdminService.Models;
using AgroConnect.Data.Entities;
using AgroConnect.Data.Persistence;
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

namespace AgroConnect.AdminService.Features;

/// <summary>The signed-in admin and the officers in their area. Every admin endpoint starts here.</summary>
internal static class CurrentAdmin
{
    public static async Task<AppUser> LoadAsync(AppDbContext db, ISessionProvider session, CancellationToken cancellationToken)
    {
        var userId = session.RequireUserId();
        return await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId && u.Role == UserRole.Admin, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status403Forbidden, "NOT_AN_ADMIN_ACCOUNT");
    }

    /// <summary>
    /// Officers the admin looks after: same region (and district, when the admin has one). An admin with
    /// no region is national and sees every officer.
    /// </summary>
    public static IQueryable<AppUser> OfficersOf(this AppDbContext db, AppUser admin) =>
        db.Users.AsNoTracking().Where(u =>
            u.Role == UserRole.Officer
            && (admin.Region == null || u.Region == admin.Region)
            && (admin.District == null || u.District == admin.District));
}

/// <summary>GET /api/admin/overview: totals for the admin's area and one line per officer (live data).</summary>
public sealed class GetOverview : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/admin/overview", Handle)
            .WithName("GetAdminOverview")
            .WithTags("Admin")
            .RequireAuthorization(AuthPolicies.Admin)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden);

    public static async Task<Ok<AdminOverview>> Handle(
        AppDbContext db, ISessionProvider session, IClock clock, CancellationToken cancellationToken)
    {
        var admin = await CurrentAdmin.LoadAsync(db, session, cancellationToken);
        var now = clock.UtcNow;
        var monthStart = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);

        var officers = await db.OfficersOf(admin)
            .OrderBy(u => u.FullName)
            .Select(u => new { u.Id, u.FullName, u.PhoneE164, u.District })
            .ToListAsync(cancellationToken);
        var ids = officers.Select(o => o.Id).ToList();

        var farmers = await db.Farmers.AsNoTracking()
            .Where(f => ids.Contains(f.RegisteredById))
            .GroupBy(f => f.RegisteredById)
            .Select(g => new
            {
                OfficerId = g.Key,
                All = g.Count(),
                ThisMonth = g.Count(f => f.CreatedAt >= monthStart),
                Last = g.Max(f => (DateTimeOffset?)f.ServerUpdatedAt),
            })
            .ToDictionaryAsync(x => x.OfficerId, cancellationToken);
        var visits = await db.Visits.AsNoTracking()
            .Where(v => ids.Contains(v.OfficerId))
            .GroupBy(v => v.OfficerId)
            .Select(g => new
            {
                OfficerId = g.Key,
                ThisMonth = g.Count(v => v.CompletedAt >= monthStart),
                Last = g.Max(v => (DateTimeOffset?)v.ServerUpdatedAt),
            })
            .ToDictionaryAsync(x => x.OfficerId, cancellationToken);

        var list = officers.Select(o =>
        {
            var f = farmers.GetValueOrDefault(o.Id);
            var v = visits.GetValueOrDefault(o.Id);
            // Last sync: the latest record from this officer the server stored.
            DateTimeOffset? lastSync = (f?.Last, v?.Last) switch
            {
                ({ } a, { } b) => a > b ? a : b,
                (var a, var b) => a ?? b,
            };
            return new OfficerSummary(
                o.Id, o.FullName, o.PhoneE164, o.District, f?.All ?? 0, f?.ThisMonth ?? 0, v?.ThisMonth ?? 0, lastSync);
        }).ToList();

        return TypedResults.Ok(new AdminOverview(
            new AdminArea(admin.Region, admin.District),
            list.Count,
            list.Sum(o => o.Farmers),
            list.Sum(o => o.FarmersThisMonth),
            list.Sum(o => o.VisitsThisMonth),
            list));
    }
}
