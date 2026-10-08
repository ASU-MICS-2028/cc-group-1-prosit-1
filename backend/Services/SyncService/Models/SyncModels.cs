using System.Text.Json.Serialization;
using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.SyncService.Models;

/// <summary>
/// What a phone sends: everything in its outbox ("to send" queue). The ids were made on the phone, so
/// sending the same batch twice changes nothing.
/// </summary>
public sealed record SyncRequest(IReadOnlyList<SyncFarmer> Farmers, IReadOnlyList<SyncVisit> Visits);

/// <summary>A farmer as the phone registered it (the seven steps). The officer is taken from the sign-in, never from here.</summary>
public sealed record SyncFarmer(
    Guid Id,
    bool ConsentGiven,
    DateTimeOffset ConsentAt,
    Language Language,
    string FullName,
    string? PhoneE164,
    bool HasNoPhone,
    Gender? Gender,
    AgeBand? AgeBand,
    string? Community,
    string? RegionDistrict,
    IReadOnlyList<Crop> Crops,
    decimal? FarmSize,
    AreaUnit FarmSizeUnit,
    SoilType? Soil,
    IReadOnlyList<PlantingSeason>? PlantingSeasons,
    double? Latitude,
    double? Longitude,
    double? LocationAccuracyMetres,
    Guid? PhotoId,
    PhoneType? PhoneType,
    DataPurchase? DataPurchase,
    IReadOnlyList<ContactChannel>? ReachChannels,
    IReadOnlyList<IncomeSource>? IncomeSources,
    bool? HasBankAccount,
    MobileMoneyUse? MobileMoney,
    LastAgentVisit? LastAgentVisit,
    IReadOnlyList<HelpNeed>? HelpNeeded,
    DateTimeOffset ClientUpdatedAt);

/// <summary>A visit as the officer logged it. The officer is taken from the sign-in, never from here.</summary>
public sealed record SyncVisit(
    Guid Id,
    Guid FarmerId,
    VisitStatus Status,
    DateOnly ScheduledFor,
    DateTimeOffset? CompletedAt,
    IReadOnlyList<VisitTopic>? Topics,
    IReadOnlyList<FarmObservation>? Observations,
    string? Notes,
    IReadOnlyList<Guid>? PhotoIds,
    DateTimeOffset ClientUpdatedAt);

public enum SyncOutcome
{
    /// <summary>New on the server.</summary>
    [JsonStringEnumMemberName("created")] Created,

    /// <summary>The server had an older copy and now has this one.</summary>
    [JsonStringEnumMemberName("updated")] Updated,

    /// <summary>The server already had this change or a newer one (a retried send, or an edit made elsewhere).</summary>
    [JsonStringEnumMemberName("unchanged")] Unchanged,

    /// <summary>Breaks a rule; <see cref="SyncResult.Problem"/> says which. The officer fixes it on the phone.</summary>
    [JsonStringEnumMemberName("invalid")] Invalid,

    /// <summary>Belongs to another officer.</summary>
    [JsonStringEnumMemberName("forbidden")] Forbidden,
}

/// <summary>The answer for one record. A record with no answer stays queued on the phone and is sent again.</summary>
public sealed record SyncResult(Guid Id, SyncOutcome Outcome, string? Problem = null);

public sealed record SyncResponse(IReadOnlyList<SyncResult> Results);
