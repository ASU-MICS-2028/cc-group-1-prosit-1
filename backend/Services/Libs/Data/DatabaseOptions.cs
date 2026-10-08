using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.Data;

/// <summary>Settings under "Database".</summary>
public sealed class DatabaseOptions
{
    /// <summary>Apply pending migrations when the API starts (retrying until the database is up).</summary>
    public bool MigrateOnStartup { get; set; }
}

/// <summary>
/// Settings under "Seed": the accounts a laptop or the staging demo starts with. The demo accounts in committed
/// files are never real people; real team members' numbers go in user-secrets or server secrets only.
/// </summary>
public sealed class SeedOptions
{
    public List<SeedOfficer> Officers { get; set; } = [];

    /// <summary>MoFA admins (ADR 0024). Same fields as an officer; Region and District are the area they look after (no District = the whole region).</summary>
    public List<SeedOfficer> Admins { get; set; } = [];

    /// <summary>Farmers to add, each registered by the officer with <see cref="SeedFarmer.OfficerPhone"/> (or the first officer).</summary>
    public List<SeedFarmer> Farmers { get; set; } = [];

    /// <summary>Also add one sample farmer (registered by the first officer) so the farmer sign-in can be tried.</summary>
    public bool SampleFarmer { get; set; }
}

public sealed class SeedOfficer
{
    public string FullName { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    public string? Region { get; set; }

    public string? District { get; set; }
}

public sealed class SeedFarmer
{
    public string FullName { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    /// <summary>The officer who registered them (their phone); empty = the first seeded officer.</summary>
    public string? OfficerPhone { get; set; }

    public string? Community { get; set; }

    /// <summary>As the app writes it, e.g. "Northern · Savelugu Municipal".</summary>
    public string? RegionDistrict { get; set; }

    public List<Crop> Crops { get; set; } = [];

    public Language Language { get; set; } = Language.English;
}
