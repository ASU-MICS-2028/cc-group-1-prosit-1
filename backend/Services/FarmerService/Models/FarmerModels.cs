using System.Text.Json.Serialization;
using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.FarmerService.Models;

/// <summary>
/// Where an answer's data comes from. <c>sample</c>: a built-in sample provider stands in until the live
/// source is connected (ADR 0031); the app labels it "Sample data". <c>live</c>: real data.
/// </summary>
public enum DataSource
{
    [JsonStringEnumMemberName("sample")] Sample = 0,
    [JsonStringEnumMemberName("live")] Live = 1,
}

// ---- My farm: the farmer's own record, their officer and their visits (live, from the database) ----

public sealed record MyFarmResponse(FarmerProfile Farmer, OfficerContact? Officer, IReadOnlyList<VisitSummary> Visits);

/// <summary>The farmer's registration, as the officer saved it. Read-only for the farmer.</summary>
public sealed record FarmerProfile(
    Guid Id,
    string FullName,
    string? PhoneE164,
    bool HasNoPhone,
    Gender? Gender,
    AgeBand? AgeBand,
    string? Community,
    string? RegionDistrict,
    Language Language,
    DateTimeOffset ConsentAt,
    IReadOnlyList<Crop> Crops,
    decimal? FarmSize,
    AreaUnit FarmSizeUnit,
    SoilType? Soil,
    IReadOnlyList<PlantingSeason> PlantingSeasons,
    double? Latitude,
    double? Longitude,
    double? LocationAccuracyMetres,
    PhoneType? PhoneType,
    IReadOnlyList<ContactChannel> ReachChannels,
    MobileMoneyUse? MobileMoney,
    IReadOnlyList<HelpNeed> HelpNeeded,
    DateTimeOffset CreatedAt);

/// <summary>The extension officer who registered the farmer: who to call.</summary>
public sealed record OfficerContact(string FullName, string PhoneE164, string? District);

public sealed record VisitSummary(
    Guid Id,
    VisitStatus Status,
    DateOnly ScheduledFor,
    DateTimeOffset? CompletedAt,
    IReadOnlyList<VisitTopic> Topics,
    IReadOnlyList<FarmObservation> Observations,
    string? Notes);

// ---- Market prices ----

public sealed record PricesResponse(
    DataSource Source,
    DateTimeOffset UpdatedAt,
    string Currency,
    IReadOnlyList<string> Markets,
    IReadOnlyList<CropPrice> Prices);

/// <summary>A crop's price per kg in each market, its change over the week, and 30 days at the first market.</summary>
public sealed record CropPrice(
    Crop Crop,
    IReadOnlyList<MarketPrice> Markets,
    decimal WeekChangePercent,
    IReadOnlyList<decimal> Last30Days);

public sealed record MarketPrice(string Market, decimal PricePerKg);

// ---- Weather ----

public enum WeatherCondition
{
    [JsonStringEnumMemberName("sunny")] Sunny = 0,
    [JsonStringEnumMemberName("partly_cloudy")] PartlyCloudy = 1,
    [JsonStringEnumMemberName("cloudy")] Cloudy = 2,
    [JsonStringEnumMemberName("rain")] Rain = 3,
    [JsonStringEnumMemberName("storm")] Storm = 4,
}

/// <summary>Farm advice that follows from the forecast; the app words it in the farmer's language.</summary>
public enum WeatherAdvice
{
    [JsonStringEnumMemberName("good_to_spray")] GoodToSpray = 0,
    [JsonStringEnumMemberName("rain_soon_dont_spray")] RainSoonDontSpray = 1,
    [JsonStringEnumMemberName("dry_spell_water")] DrySpellWater = 2,
    [JsonStringEnumMemberName("storm_protect_harvest")] StormProtectHarvest = 3,
}

public sealed record WeatherResponse(
    DataSource Source,
    DateTimeOffset UpdatedAt,
    string Place,
    WeatherDay Today,
    IReadOnlyList<WeatherDay> NextDays,
    WeatherAdvice Advice);

public sealed record WeatherDay(DateOnly Date, WeatherCondition Condition, int MaxC, int MinC, int RainChancePercent);

// ---- Check my crop ----

public enum CropSymptom
{
    [JsonStringEnumMemberName("yellow_leaves")] YellowLeaves = 0,
    [JsonStringEnumMemberName("holes_in_leaves")] HolesInLeaves = 1,
    [JsonStringEnumMemberName("spots_on_leaves")] SpotsOnLeaves = 2,
    [JsonStringEnumMemberName("wilting")] Wilting = 3,
    [JsonStringEnumMemberName("insects_seen")] InsectsSeen = 4,
    [JsonStringEnumMemberName("stunted")] Stunted = 5,
    [JsonStringEnumMemberName("rotting")] Rotting = 6,
}

public enum CropProblem
{
    [JsonStringEnumMemberName("fall_armyworm")] FallArmyworm = 0,
    [JsonStringEnumMemberName("leaf_spot")] LeafSpot = 1,
    [JsonStringEnumMemberName("nutrient_shortage")] NutrientShortage = 2,
    [JsonStringEnumMemberName("drought_stress")] DroughtStress = 3,
    [JsonStringEnumMemberName("root_rot")] RootRot = 4,
    [JsonStringEnumMemberName("unclear")] Unclear = 5,
}

public enum CropAdvice
{
    [JsonStringEnumMemberName("check_under_leaves")] CheckUnderLeaves = 0,
    [JsonStringEnumMemberName("pick_and_crush")] PickAndCrush = 1,
    [JsonStringEnumMemberName("ask_officer_spray")] AskOfficerSpray = 2,
    [JsonStringEnumMemberName("remove_sick_leaves")] RemoveSickLeaves = 3,
    [JsonStringEnumMemberName("add_fertiliser")] AddFertiliser = 4,
    [JsonStringEnumMemberName("water_early")] WaterEarly = 5,
    [JsonStringEnumMemberName("mulch_soil")] MulchSoil = 6,
    [JsonStringEnumMemberName("improve_drainage")] ImproveDrainage = 7,
    [JsonStringEnumMemberName("show_officer")] ShowOfficer = 8,
}

public sealed record CropCheckRequest(Crop Crop, IReadOnlyList<CropSymptom> Symptoms);

public sealed record CropCheckResponse(
    DataSource Source,
    CropProblem LikelyProblem,
    bool Urgent,
    IReadOnlyList<CropAdvice> Advice);

// ---- Harvest forecast ----

public sealed record HarvestForecastResponse(DataSource Source, IReadOnlyList<CropForecast> Crops);

/// <summary>An expected harvest range in 100 kg bags, and the month it is usually ready (1 to 12).</summary>
public sealed record CropForecast(Crop Crop, int LowBags, int HighBags, int HarvestMonth);

// ---- My cooperative ----

public sealed record CooperativeResponse(
    DataSource Source,
    string Name,
    string Community,
    int Members,
    string ChairName,
    string ChairPhoneE164,
    DateOnly NextMeeting,
    string MeetingPlace);

// ---- Lessons ----

public enum LessonTopic
{
    [JsonStringEnumMemberName("storage")] Storage = 0,
    [JsonStringEnumMemberName("pests")] Pests = 1,
    [JsonStringEnumMemberName("planting")] Planting = 2,
    [JsonStringEnumMemberName("soil")] Soil = 3,
    [JsonStringEnumMemberName("selling")] Selling = 4,
    [JsonStringEnumMemberName("money")] Money = 5,
}

/// <summary>A short audio lesson. The app shows its title and summary in the farmer's language by <c>Id</c>.</summary>
public sealed record Lesson(string Id, LessonTopic Topic, int Minutes);

public sealed record LessonsResponse(DataSource Source, IReadOnlyList<Lesson> Lessons);

// ---- Change my details ----

public enum ChangeArea
{
    [JsonStringEnumMemberName("phone")] Phone = 0,
    [JsonStringEnumMemberName("farm")] Farm = 1,
    [JsonStringEnumMemberName("crops")] Crops = 2,
    [JsonStringEnumMemberName("other")] Other = 3,
}

public sealed record ChangeRequest(ChangeArea Area, string Details);

/// <summary>The request was passed on; <c>Reference</c> is what the farmer can quote to their officer.</summary>
public sealed record ChangeRequestResponse(DataSource Source, string Reference);

/// <summary>The farmer's SMS alerts. HasPhone false: no number on record, so nothing can be sent.</summary>
public sealed record AlertSettings(IReadOnlyList<Crop> PriceCrops, bool HeavyRain, bool DrySpell, bool HasPhone);

public sealed record AlertSettingsRequest(IReadOnlyList<Crop> PriceCrops, bool HeavyRain, bool DrySpell);
