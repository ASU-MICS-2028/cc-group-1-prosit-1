namespace AgroConnect.Data;

/// <summary>Settings under "Database".</summary>
public sealed class DatabaseOptions
{
    /// <summary>Apply pending migrations when the API starts (retrying until the database is up).</summary>
    public bool MigrateOnStartup { get; set; }
}

/// <summary>Settings under "Seed": demo accounts for development and the staging demo. Never real people.</summary>
public sealed class SeedOptions
{
    public List<SeedOfficer> Officers { get; set; } = [];

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
