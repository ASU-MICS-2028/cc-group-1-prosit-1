using System.Text;
using System.Text.Json;
using AgroConnect.Data.Entities;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Messages;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using AgroConnect.SyncService.Features;
using AgroConnect.SyncService.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace AgroConnect.SyncService.Tests;

[CollectionDefinition(Name)]
public sealed class DatabaseCollection : ICollectionFixture<PostgresFixture>
{
    public const string Name = "database";
}

/// <summary>A real database, an officer signed in, and records shaped exactly as the app sends them.</summary>
public abstract class SyncTestBase(PostgresFixture database) : IAsyncLifetime
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);
    private int _phoneCounter;

    protected PostgresFixture Database { get; } = database;

    protected TestClock Clock { get; } = new();

    protected ISessionProvider Session { get; } = Substitute.For<ISessionProvider>();

    protected IMessageProvider Messages { get; } =
        new MessageProvider([new AssemblyMessageSource(typeof(SyncServiceExtension).Assembly)]);

    protected AppUser Officer { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        await Database.ResetAsync();
        Session.Language.Returns(Language.English);
        Officer = await AddOfficerAsync("Fuseini Alhassan");
        SignInAs(Officer);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    protected void SignInAs(AppUser officer)
    {
        Session.UserId.Returns(officer.Id);
        Session.RequireUserId().Returns(officer.Id);
    }

    protected async Task<AppUser> AddOfficerAsync(string fullName)
    {
        var officer = new AppUser
        {
            Id = Guid.CreateVersion7(),
            Role = UserRole.Officer,
            PhoneE164 = $"+23324000{++_phoneCounter:0000}",
            FullName = fullName,
            CreatedAt = Clock.UtcNow,
        };
        await using var db = Database.CreateContext();
        db.Users.Add(officer);
        await db.SaveChangesAsync();
        return officer;
    }

    /// <summary>Sends a batch the way the app does (JSON body) and returns the answers.</summary>
    protected Task<IReadOnlyList<SyncResult>> SyncAsync(
        IEnumerable<Dictionary<string, object?>>? farmers = null, IEnumerable<Dictionary<string, object?>>? visits = null) =>
        SyncRawAsync(JsonSerializer.Serialize(new { farmers = farmers ?? [], visits = visits ?? [] }, Web));

    protected async Task<IReadOnlyList<SyncResult>> SyncRawAsync(string json)
    {
        var context = new DefaultHttpContext();
        context.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(json));
        await using var db = Database.CreateContext();
        var answer = await SyncRecords.Handle(
            context.Request, db, Session, Clock, Messages, NullLogger<SyncRecords>.Instance, CancellationToken.None);
        return answer.Value!.Results;
    }

    protected async Task<Farmer?> StoredFarmerAsync(Guid id)
    {
        await using var db = Database.CreateContext();
        return await db.Farmers.FindAsync(id);
    }

    protected async Task<Visit?> StoredVisitAsync(Guid id)
    {
        await using var db = Database.CreateContext();
        return await db.Visits.FindAsync(id);
    }

    protected string Text(string key) => Messages.Get(key, Language.English);

    /// <summary>A farmer as the phone sends it (LocalFarmer without the phone-only fields).</summary>
    protected Dictionary<string, object?> FarmerFromPhone(Guid? id = null, DateTimeOffset? changedAt = null)
    {
        var at = changedAt ?? Clock.UtcNow.AddMinutes(-30);
        return new Dictionary<string, object?>
        {
            ["id"] = (id ?? Guid.CreateVersion7()).ToString(),
            ["consentGiven"] = true,
            ["fullName"] = "  Ama Boateng ",
            ["phoneE164"] = "+233241000001",
            ["hasNoPhone"] = false,
            ["gender"] = "female",
            ["ageBand"] = "36-50",
            ["community"] = "Tolon",
            ["regionDistrict"] = "",
            ["crops"] = new[] { "maize", "groundnut", "maize" },
            ["farmSize"] = 2.5,
            ["farmSizeUnit"] = "acres",
            ["soil"] = "loamy",
            ["plantingSeasons"] = new[] { "rainy" },
            ["latitude"] = 9.43,
            ["longitude"] = -0.98,
            ["locationAccuracyMetres"] = 12.0,
            ["photoId"] = null,
            ["photoSizeBytes"] = null,
            ["phoneType"] = "basic_phone",
            ["dataPurchase"] = "weekly",
            ["reachChannels"] = new[] { "sms", "call" },
            ["incomeSources"] = new[] { "crops" },
            ["hasBankAccount"] = false,
            ["mobileMoney"] = "yes",
            ["lastAgentVisit"] = "last_year",
            ["helpNeeded"] = new[] { "seeds", "pests" },
            ["language"] = "tw",
            ["consentAt"] = at,
            // The app sends who registered the farmer; the server ignores it and uses the sign-in.
            ["registeredById"] = Guid.CreateVersion7().ToString(),
            ["createdAt"] = at,
            ["clientUpdatedAt"] = at,
        };
    }

    /// <summary>A visit as the phone sends it (LocalVisit without the phone-only fields).</summary>
    protected Dictionary<string, object?> VisitFromPhone(object farmerId, Guid? id = null, DateTimeOffset? changedAt = null)
    {
        var at = changedAt ?? Clock.UtcNow.AddMinutes(-20);
        return new Dictionary<string, object?>
        {
            ["id"] = (id ?? Guid.CreateVersion7()).ToString(),
            ["farmerId"] = farmerId.ToString(),
            ["officerId"] = Guid.CreateVersion7().ToString(),
            ["status"] = "done",
            ["scheduledFor"] = "2026-10-01",
            ["completedAt"] = at,
            ["topics"] = new[] { "pests", "weather" },
            ["observations"] = new[] { "pests" },
            ["notes"] = " Fall armyworm on the east side ",
            ["photoIds"] = Array.Empty<string>(),
            ["createdAt"] = at,
            ["clientUpdatedAt"] = at,
        };
    }

    /// <summary>A farmer already on the server.</summary>
    protected async Task<Farmer> AddFarmerAsync(AppUser officer, DateTimeOffset? changedAt = null)
    {
        var at = changedAt ?? Clock.UtcNow.AddDays(-1);
        var farmer = new Farmer
        {
            Id = Guid.CreateVersion7(),
            RegisteredById = officer.Id,
            ConsentGiven = true,
            ConsentAt = at,
            FullName = "Kofi Asante",
            PhoneE164 = $"+23324100{++_phoneCounter:0000}",
            Crops = [Crop.Yam],
            FarmSize = 1,
            ClientUpdatedAt = at,
            ServerUpdatedAt = at,
            CreatedAt = at,
        };
        await using var db = Database.CreateContext();
        db.Farmers.Add(farmer);
        await db.SaveChangesAsync();
        return farmer;
    }

    /// <summary>A visit already on the server.</summary>
    protected async Task<Visit> AddVisitAsync(Farmer farmer, AppUser officer)
    {
        var at = Clock.UtcNow.AddDays(-1);
        var visit = new Visit
        {
            Id = Guid.CreateVersion7(),
            FarmerId = farmer.Id,
            OfficerId = officer.Id,
            Status = VisitStatus.Done,
            ScheduledFor = DateOnly.FromDateTime(at.UtcDateTime),
            CompletedAt = at,
            ClientUpdatedAt = at,
            ServerUpdatedAt = at,
            CreatedAt = at,
        };
        await using var db = Database.CreateContext();
        db.Visits.Add(visit);
        await db.SaveChangesAsync();
        return visit;
    }
}
