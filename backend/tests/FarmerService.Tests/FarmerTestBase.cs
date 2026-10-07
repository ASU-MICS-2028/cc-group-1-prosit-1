using AgroConnect.Data.Entities;
using AgroConnect.Data.Persistence;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using NSubstitute;

namespace AgroConnect.FarmerService.Tests;

[CollectionDefinition(Name)]
public sealed class DatabaseCollection : ICollectionFixture<PostgresFixture>
{
    public const string Name = "database";
}

/// <summary>A real database, a farmer signed in (the session), and helpers to add an officer, farmers and visits.</summary>
public abstract class FarmerTestBase(PostgresFixture database) : IAsyncLifetime
{
    private int _phoneCounter;

    protected PostgresFixture Database { get; } = database;

    protected AppDbContext Db { get; private set; } = null!;

    protected TestClock Clock { get; } = new();

    protected ISessionProvider Session { get; } = Substitute.For<ISessionProvider>();

    public async Task InitializeAsync()
    {
        await Database.ResetAsync();
        Db = Database.CreateContext();
        Session.Language.Returns(Language.English);
    }

    public async Task DisposeAsync() => await Db.DisposeAsync();

    /// <summary>The session now belongs to this farmer.</summary>
    protected void SignInAs(Farmer farmer) => Session.FarmerId.Returns(farmer.Id);

    protected async Task<AppUser> AddOfficerAsync(string fullName = "Fuseini Alhassan")
    {
        var officer = new AppUser
        {
            Id = Guid.CreateVersion7(),
            Role = UserRole.Officer,
            PhoneE164 = $"+23324000{++_phoneCounter:0000}",
            FullName = fullName,
            Region = "Northern",
            District = "Savelugu",
            CreatedAt = Clock.UtcNow,
        };
        await using var db = Database.CreateContext();
        db.Users.Add(officer);
        await db.SaveChangesAsync();
        return officer;
    }

    protected async Task<Farmer> AddFarmerAsync(AppUser officer, string fullName = "Ama Boateng", Action<Farmer>? change = null)
    {
        var farmer = new Farmer
        {
            Id = Guid.CreateVersion7(),
            RegisteredById = officer.Id,
            ConsentGiven = true,
            ConsentAt = Clock.UtcNow,
            Language = Language.Twi,
            FullName = fullName,
            PhoneE164 = $"+23324100{++_phoneCounter:0000}",
            Gender = Gender.Female,
            AgeBand = AgeBand.From36To50,
            Community = "Tolon",
            RegionDistrict = "Northern · Tolon District",
            Crops = [Crop.Maize, Crop.Groundnut],
            FarmSize = 2.5m,
            FarmSizeUnit = AreaUnit.Acres,
            Soil = SoilType.Loamy,
            ClientUpdatedAt = Clock.UtcNow,
            ServerUpdatedAt = Clock.UtcNow,
            CreatedAt = Clock.UtcNow,
        };
        change?.Invoke(farmer);
        await using var db = Database.CreateContext();
        db.Farmers.Add(farmer);
        await db.SaveChangesAsync();
        return farmer;
    }

    protected async Task<Visit> AddVisitAsync(Farmer farmer, AppUser officer, int daysAgo, params VisitTopic[] topics)
    {
        var day = Clock.UtcNow.AddDays(-daysAgo);
        var visit = new Visit
        {
            Id = Guid.CreateVersion7(),
            FarmerId = farmer.Id,
            OfficerId = officer.Id,
            Status = VisitStatus.Done,
            ScheduledFor = DateOnly.FromDateTime(day.UtcDateTime),
            CompletedAt = day,
            Topics = [.. topics],
            Observations = [FarmObservation.AllGood],
            Notes = "Spray in the evening",
            ClientUpdatedAt = day,
            ServerUpdatedAt = day,
            CreatedAt = day,
        };
        await using var db = Database.CreateContext();
        db.Visits.Add(visit);
        await db.SaveChangesAsync();
        return visit;
    }
}
