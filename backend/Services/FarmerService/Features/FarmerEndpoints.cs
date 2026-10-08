using AgroConnect.Data.Entities;
using AgroConnect.Data.Persistence;
using AgroConnect.FarmerService.Models;
using AgroConnect.FarmerService.Providers.Interfaces;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using AgroConnect.SharedLibrary.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace AgroConnect.FarmerService.Features;

/// <summary>The signed-in farmer's own record. Every farmer endpoint starts here: a farmer only ever sees their own farm.</summary>
internal static class CurrentFarmer
{
    public static async Task<Farmer> LoadAsync(AppDbContext db, ISessionProvider session, CancellationToken cancellationToken)
    {
        var farmerId = session.FarmerId ?? throw new ApiException(StatusCodes.Status403Forbidden, "NOT_A_FARMER_ACCOUNT");
        return await db.Farmers.AsNoTracking().FirstOrDefaultAsync(f => f.Id == farmerId, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "FARMER_NOT_FOUND");
    }

    /// <summary>Farmer endpoints: /api/farmer/..., signed in as a farmer, described in the contract under "Farmer".</summary>
    public static RouteHandlerBuilder ForFarmers(this RouteHandlerBuilder route, string name) =>
        route.WithName(name)
            .WithTags("Farmer")
            .RequireAuthorization(AuthPolicies.Farmer)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);
}

/// <summary>My farm: the farmer's registration, the officer who registered them, and their visits (live data).</summary>
public sealed class GetMyFarm : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/farmer/me", Handle).ForFarmers("GetMyFarm");

    public static async Task<Ok<MyFarmResponse>> Handle(AppDbContext db, ISessionProvider session, CancellationToken cancellationToken)
    {
        var farmer = await CurrentFarmer.LoadAsync(db, session, cancellationToken);
        var officer = await db.Users.AsNoTracking()
            .Where(u => u.Id == farmer.RegisteredById)
            .Select(u => new OfficerContact(u.FullName, u.PhoneE164, u.District))
            .FirstOrDefaultAsync(cancellationToken);
        var visits = await db.Visits.AsNoTracking()
            .Where(v => v.FarmerId == farmer.Id)
            .OrderByDescending(v => v.ScheduledFor)
            .Take(20)
            .Select(v => new VisitSummary(v.Id, v.Status, v.ScheduledFor, v.CompletedAt, v.Topics, v.Observations, v.Notes))
            .ToListAsync(cancellationToken);

        return TypedResults.Ok(new MyFarmResponse(ToProfile(farmer), officer, visits));
    }

    public static FarmerProfile ToProfile(Farmer f) => new(
        f.Id,
        f.FullName,
        f.PhoneE164,
        f.HasNoPhone,
        f.Gender,
        f.AgeBand,
        f.Community,
        f.RegionDistrict,
        f.Language,
        f.ConsentAt,
        f.Crops,
        f.FarmSize,
        f.FarmSizeUnit,
        f.Soil,
        f.PlantingSeasons,
        f.Latitude,
        f.Longitude,
        f.LocationAccuracyMetres,
        f.PhoneType,
        f.ReachChannels,
        f.MobileMoney,
        f.HelpNeeded,
        f.CreatedAt);
}

/// <summary>Crop prices near the farmer, their own crops first.</summary>
public sealed class GetPrices : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/farmer/prices", Handle).ForFarmers("GetPrices");

    public static async Task<Ok<PricesResponse>> Handle(
        AppDbContext db, ISessionProvider session, IMarketPriceProvider prices, CancellationToken cancellationToken)
    {
        var farmer = await CurrentFarmer.LoadAsync(db, session, cancellationToken);
        return TypedResults.Ok(await prices.GetPricesAsync(farmer.RegionDistrict, farmer.Crops, cancellationToken));
    }
}

/// <summary>Weather for the farm and the advice that follows from it.</summary>
public sealed class GetWeather : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/farmer/weather", Handle).ForFarmers("GetWeather");

    public static async Task<Ok<WeatherResponse>> Handle(
        AppDbContext db, ISessionProvider session, IWeatherProvider weather, CancellationToken cancellationToken)
    {
        var farmer = await CurrentFarmer.LoadAsync(db, session, cancellationToken);
        var place = string.IsNullOrWhiteSpace(farmer.Community) ? farmer.RegionDistrict ?? "Northern Region" : farmer.Community;
        return TypedResults.Ok(await weather.GetForecastAsync(place, farmer.Latitude, farmer.Longitude, cancellationToken));
    }
}

/// <summary>Check my crop: what the farmer sees in, a likely problem and what to do out.</summary>
public sealed class CheckCrop : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/farmer/crop-check", Handle).ForFarmers("CheckCrop").ProducesProblem(StatusCodes.Status400BadRequest);

    public static async Task<Ok<CropCheckResponse>> Handle(
        CropCheckRequest request, AppDbContext db, ISessionProvider session, ICropAdviser adviser, CancellationToken cancellationToken)
    {
        await CurrentFarmer.LoadAsync(db, session, cancellationToken);
        if (request.Symptoms is not { Count: > 0 })
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "SYMPTOMS_REQUIRED");
        }

        return TypedResults.Ok(await adviser.CheckAsync(request, cancellationToken));
    }
}

/// <summary>The expected harvest from the farm's crops and size.</summary>
public sealed class GetHarvestForecast : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/farmer/harvest-forecast", Handle).ForFarmers("GetHarvestForecast");

    public static async Task<Ok<HarvestForecastResponse>> Handle(
        AppDbContext db, ISessionProvider session, IHarvestForecaster forecaster, CancellationToken cancellationToken)
    {
        var farmer = await CurrentFarmer.LoadAsync(db, session, cancellationToken);
        return TypedResults.Ok(await forecaster.ForecastAsync(farmer.Crops, farmer.FarmSize, farmer.FarmSizeUnit, cancellationToken));
    }
}

/// <summary>
/// The farmer's cooperative for the Home tile: its name, members, leader and next meeting, from the
/// cooperatives tables (ADR 0037). 404 when the farmer is not in one yet.
/// </summary>
public sealed class GetCooperative : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/farmer/cooperative", Handle).ForFarmers("GetCooperative");

    public static async Task<Ok<CooperativeResponse>> Handle(
        AppDbContext db, ISessionProvider session, IClock clock, CancellationToken cancellationToken)
    {
        var farmer = await CurrentFarmer.LoadAsync(db, session, cancellationToken);
        var cooperative = await (
                from member in db.CooperativeMembers.AsNoTracking()
                join coop in db.Cooperatives.AsNoTracking() on member.CooperativeId equals coop.Id
                where member.FarmerId == farmer.Id
                select coop)
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "NOT_IN_A_COOPERATIVE");
        var members = await db.CooperativeMembers.CountAsync(m => m.CooperativeId == cooperative.Id, cancellationToken);
        var leader = await db.Farmers.AsNoTracking()
            .Where(f => f.Id == cooperative.LeaderFarmerId)
            .Select(f => new { f.FullName, f.PhoneE164 })
            .SingleAsync(cancellationToken);
        var now = clock.UtcNow;
        var meeting = await db.Meetings.AsNoTracking()
            .Where(m => m.CooperativeId == cooperative.Id && m.StartsAt >= now)
            .OrderBy(m => m.StartsAt)
            .FirstOrDefaultAsync(cancellationToken);
        return TypedResults.Ok(new CooperativeResponse(
            DataSource.Live,
            cooperative.Name,
            cooperative.Community,
            members,
            leader.FullName,
            leader.PhoneE164,
            meeting is null ? null : DateOnly.FromDateTime(meeting.StartsAt.UtcDateTime),
            meeting?.Place));
    }
}

/// <summary>The short audio lessons.</summary>
public sealed class GetLessons : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/farmer/lessons", Handle).ForFarmers("GetLessons");

    public static async Task<Ok<LessonsResponse>> Handle(
        AppDbContext db, ISessionProvider session, ILessonCatalogue catalogue, CancellationToken cancellationToken)
    {
        await CurrentFarmer.LoadAsync(db, session, cancellationToken);
        return TypedResults.Ok(await catalogue.ListAsync(cancellationToken));
    }
}

/// <summary>Change my details: farmers cannot edit their record; the request goes to their officer.</summary>
public sealed class RequestChange : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/farmer/change-requests", Handle).ForFarmers("RequestChange").ProducesProblem(StatusCodes.Status400BadRequest);

    public static async Task<Accepted<ChangeRequestResponse>> Handle(
        ChangeRequest request, AppDbContext db, ISessionProvider session, IChangeRequestInbox inbox, CancellationToken cancellationToken)
    {
        var farmer = await CurrentFarmer.LoadAsync(db, session, cancellationToken);
        var details = request.Details?.Trim() ?? string.Empty;
        if (details.Length is 0 or > 500)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "CHANGE_DETAILS_REQUIRED");
        }

        var answer = await inbox.SubmitAsync(farmer.Id, farmer.RegisteredById, request with { Details = details }, cancellationToken);
        return TypedResults.Accepted((string?)null, answer);
    }
}
