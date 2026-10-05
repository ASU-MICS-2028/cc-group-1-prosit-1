using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.Data.Entities;

/// <summary>
/// A registered farmer: the seven registration steps. The id is made on the phone (offline first),
/// so a retried sync never creates a duplicate.
/// </summary>
public sealed class Farmer
{
    public Guid Id { get; set; }

    /// <summary>The officer who registered the farmer.</summary>
    public Guid RegisteredById { get; set; }

    // Step 1: consent
    public bool ConsentGiven { get; set; }

    public DateTimeOffset ConsentAt { get; set; }

    /// <summary>The language consent was given in, which is also the language the farmer prefers.</summary>
    public Language Language { get; set; }

    // Step 2: about the farmer
    public required string FullName { get; set; }

    public string? PhoneE164 { get; set; }

    public bool HasNoPhone { get; set; }

    public Gender? Gender { get; set; }

    public AgeBand? AgeBand { get; set; }

    public string? Community { get; set; }

    public string? RegionDistrict { get; set; }

    // Step 3: the farm
    public List<Crop> Crops { get; set; } = [];

    public decimal? FarmSize { get; set; }

    public AreaUnit FarmSizeUnit { get; set; }

    public SoilType? Soil { get; set; }

    public List<PlantingSeason> PlantingSeasons { get; set; } = [];

    // Step 4: location and photo
    public double? Latitude { get; set; }

    public double? Longitude { get; set; }

    public double? LocationAccuracyMetres { get; set; }

    public Guid? PhotoId { get; set; }

    // Step 5: contact
    public PhoneType? PhoneType { get; set; }

    public DataPurchase? DataPurchase { get; set; }

    public List<ContactChannel> ReachChannels { get; set; } = [];

    // Step 6: money (optional)
    public List<IncomeSource> IncomeSources { get; set; } = [];

    public bool? HasBankAccount { get; set; }

    public MobileMoneyUse? MobileMoney { get; set; }

    // Step 7: help needed
    public LastAgentVisit? LastAgentVisit { get; set; }

    public List<HelpNeed> HelpNeeded { get; set; } = [];

    /// <summary>When the record last changed on the phone; the newest change wins on sync.</summary>
    public DateTimeOffset ClientUpdatedAt { get; set; }

    /// <summary>When the server last stored a change; phones pull changes newer than their last sync.</summary>
    public DateTimeOffset ServerUpdatedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
