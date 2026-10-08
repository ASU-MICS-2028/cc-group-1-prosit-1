using AgroConnect.Data.Entities;
using AgroConnect.Data.Persistence;
using AgroConnect.FarmerService.Models;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace AgroConnect.FarmerService.Features;

/// <summary>
/// GET /api/farmer/alerts: the SMS alerts the farmer chose (Figma P2 · 07). Before they choose, price alerts
/// are on for their own crops and both weather warnings are on.
/// </summary>
public sealed class GetAlerts : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/farmer/alerts", Handle).ForFarmers("GetAlerts");

    public static async Task<Ok<AlertSettings>> Handle(AppDbContext db, ISessionProvider session, CancellationToken cancellationToken)
    {
        var farmer = await CurrentFarmer.LoadAsync(db, session, cancellationToken);
        var saved = await db.AlertSettings.AsNoTracking().FirstOrDefaultAsync(a => a.FarmerId == farmer.Id, cancellationToken);
        return TypedResults.Ok(saved is null
            ? new AlertSettings(farmer.Crops, true, true, farmer.PhoneE164 is not null)
            : new AlertSettings(saved.PriceCrops, saved.HeavyRain, saved.DrySpell, farmer.PhoneE164 is not null));
    }
}

/// <summary>PUT /api/farmer/alerts: saves the farmer's choice. Sending starts once the SMS provider is connected.</summary>
public sealed class SaveAlerts : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPut("/api/farmer/alerts", Handle).ForFarmers("SaveAlerts");

    public static async Task<Ok<AlertSettings>> Handle(
        AlertSettingsRequest request, AppDbContext db, ISessionProvider session, IClock clock, CancellationToken cancellationToken)
    {
        var farmer = await CurrentFarmer.LoadAsync(db, session, cancellationToken);
        var saved = await db.AlertSettings.FirstOrDefaultAsync(a => a.FarmerId == farmer.Id, cancellationToken);
        if (saved is null)
        {
            saved = new AlertSetting { FarmerId = farmer.Id };
            db.AlertSettings.Add(saved);
        }

        saved.PriceCrops = request.PriceCrops.Distinct().ToList();
        saved.HeavyRain = request.HeavyRain;
        saved.DrySpell = request.DrySpell;
        saved.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok(new AlertSettings(saved.PriceCrops, saved.HeavyRain, saved.DrySpell, farmer.PhoneE164 is not null));
    }
}
