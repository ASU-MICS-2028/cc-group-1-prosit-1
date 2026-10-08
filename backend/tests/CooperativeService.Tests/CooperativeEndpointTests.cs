using AgroConnect.CooperativeService.Features;
using AgroConnect.CooperativeService.Models;
using AgroConnect.Data.Entities;
using AgroConnect.MoneyService.Providers;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;

namespace AgroConnect.CooperativeService.Tests;

[CollectionDefinition(Name)]
public sealed class DatabaseCollection : ICollectionFixture<PostgresFixture>
{
    public const string Name = "database";
}

/// <summary>A cooperative from the officer starting it to farmers saving, ordering, selling and meeting (ADR 0040).</summary>
[IntegrationTest]
[Collection(DatabaseCollection.Name)]
public sealed class CooperativeEndpointTests(PostgresFixture database) : IAsyncLifetime
{
    private readonly TestClock _clock = new();
    private AppUser _officer = null!;
    private AppUser _otherOfficer = null!;
    private AppUser _admin = null!;
    private AppUser _farAdmin = null!;
    private Farmer _leader = null!;
    private Farmer _farmer = null!;
    private Farmer _othersFarmer = null!;

    public async Task InitializeAsync()
    {
        await database.ResetAsync();
        _officer = User(UserRole.Officer, "+233240000001", "Kofi Asante", "Northern", "Tolon");
        _otherOfficer = User(UserRole.Officer, "+233240000002", "Abena Darko", "Volta", "Ho");
        _admin = User(UserRole.Admin, "+233240000009", "Esi Owusu", "Northern", null);
        _farAdmin = User(UserRole.Admin, "+233240000008", "Kwame Mensah", "Volta", null);
        _leader = Farmer(_officer, "Mariama Alhassan", "+233241000001");
        _farmer = Farmer(_officer, "Hawa Issah", "+233241000002");
        _othersFarmer = Farmer(_otherOfficer, "Yaw Boateng", "+233241000003");
        await using var db = database.CreateContext();
        db.Users.AddRange(_officer, _otherOfficer, _admin, _farAdmin);
        db.Farmers.AddRange(_leader, _farmer, _othersFarmer);
        await db.SaveChangesAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private AppUser User(UserRole role, string phone, string name, string region, string? district) => new()
    {
        Id = Guid.CreateVersion7(),
        Role = role,
        PhoneE164 = phone,
        FullName = name,
        Region = region,
        District = district,
        CreatedAt = _clock.UtcNow,
    };

    private Farmer Farmer(AppUser officer, string name, string phone) => new()
    {
        Id = Guid.CreateVersion7(),
        RegisteredById = officer.Id,
        FullName = name,
        PhoneE164 = phone,
        Community = "Tolon",
        Crops = [Crop.Maize],
        CreatedAt = _clock.UtcNow,
    };

    private static ISessionProvider As(Guid userId, Guid? farmerId = null)
    {
        var session = Substitute.For<ISessionProvider>();
        session.UserId.Returns(userId);
        session.RequireUserId().Returns(userId);
        session.FarmerId.Returns(farmerId);
        return session;
    }

    private ISessionProvider Officer => As(_officer.Id);

    private ISessionProvider FarmerSession(Farmer farmer) => As(Guid.NewGuid(), farmer.Id);

    /// <summary>The officer starts a cooperative led by Mariama, adds Hawa, and opens an order, a sale and a meeting.</summary>
    private async Task<Guid> StartAsync()
    {
        await using var db = database.CreateContext();
        var created = (await CreateCooperative.Handle(
            new CreateCooperativeRequest(" Tolon Women Farmers ", "Tolon", _leader.Id), db, Officer, _clock, CancellationToken.None)).Value!;
        await AddCooperativeMember.Handle(created.Id, new AddMemberRequest(_farmer.Id), db, Officer, _clock, CancellationToken.None);
        await CreateOrder.Handle(
            created.Id,
            new CreateOrderRequest("NPK fertiliser", "Tolon Agro Inputs", 150m, 170m, 120, DateOnly.FromDateTime(_clock.UtcNow.UtcDateTime).AddDays(5)),
            db, Officer, _clock, CancellationToken.None);
        await CreateSale.Handle(created.Id, new CreateSaleRequest("Maize", "Savelugu Grain Traders", 6.8m, 6.5m, 20_000), db, Officer, _clock, CancellationToken.None);
        await CreateMeeting.Handle(
            created.Id, new CreateMeetingRequest(_clock.UtcNow.AddDays(3), "Community centre", "Selling maize", null), db, Officer, _clock, CancellationToken.None);
        return created.Id;
    }

    private async Task<CooperativeDetails> MineAsync(Farmer farmer)
    {
        await using var db = database.CreateContext();
        return (await GetMyCooperative.Handle(db, FarmerSession(farmer), _clock, CancellationToken.None)).Value!;
    }

    [Fact]
    public async Task Farmers_join_the_order_pledge_bags_and_say_they_are_coming()
    {
        await StartAsync();
        var start = await MineAsync(_farmer);
        Assert.Equal("Tolon Women Farmers", start.Name);
        Assert.Equal("Mariama Alhassan", start.LeaderName);
        Assert.Equal(2, start.Members.Count);
        Assert.Equal("Tolon", start.District);

        await using (var db = database.CreateContext())
        {
            await UpdateOrder.Handle(start.OpenOrder!.Id, new UpdateBagsRequest(3), db, FarmerSession(_farmer), _clock, CancellationToken.None);
            await UpdateOrder.Handle(start.OpenOrder.Id, new UpdateBagsRequest(2), db, FarmerSession(_leader), _clock, CancellationToken.None);
            await UpdateSale.Handle(start.OpenSale!.Id, new UpdateBagsRequest(4), db, FarmerSession(_farmer), CancellationToken.None);
            await UpdateRsvp.Handle(start.NextMeeting!.Id, new RsvpRequest(true), db, FarmerSession(_farmer), CancellationToken.None);
        }

        var after = await MineAsync(_farmer);
        Assert.Equal(5, after.OpenOrder!.OrderedBags);
        Assert.Equal(3, after.OpenOrder.MyBags);
        Assert.Equal(400, after.OpenSale!.PledgedKg);
        Assert.Equal(1, after.OpenSale.Pledgers);
        Assert.True(after.NextMeeting!.Coming);
        Assert.Equal(1, after.NextMeeting.ComingCount);

        await using (var db = database.CreateContext())
        {
            await UpdateOrder.Handle(start.OpenOrder.Id, new UpdateBagsRequest(0), db, FarmerSession(_farmer), _clock, CancellationToken.None);
            await UpdateSale.Handle(start.OpenSale.Id, new UpdateBagsRequest(6), db, FarmerSession(_farmer), CancellationToken.None);
            await UpdateSale.Handle(start.OpenSale.Id, new UpdateBagsRequest(0), db, FarmerSession(_farmer), CancellationToken.None);
            await UpdateRsvp.Handle(start.NextMeeting.Id, new RsvpRequest(false), db, FarmerSession(_farmer), CancellationToken.None);
        }

        var left = await MineAsync(_farmer);
        Assert.Equal(0, left.OpenOrder!.MyBags);
        Assert.Equal(0, left.OpenSale!.PledgedKg);
        Assert.False(left.NextMeeting!.Coming);
    }

    [Fact]
    public async Task Savings_count_only_once_the_payment_is_paid()
    {
        await StartAsync();
        await using (var db = database.CreateContext())
        {
            db.Wallets.Add(new Wallet
            {
                Id = Guid.CreateVersion7(),
                FarmerId = _farmer.Id,
                Network = MobileNetwork.Mtn,
                PhoneE164 = _farmer.PhoneE164!,
                CreatedAt = _clock.UtcNow,
                UpdatedAt = _clock.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        PaymentInfoStub payment;
        await using (var db = database.CreateContext())
        {
            var started = (await AddSavings.Handle(
                new AddSavingsRequest(20m), db, FarmerSession(_farmer), new SamplePaymentGateway(_clock), _clock,
                Options.Create(new PaystackOptions()), CancellationToken.None)).Value!;
            payment = new PaymentInfoStub(started.Reference, started.Status);
        }

        Assert.NotEqual(PaymentStatus.Paid, payment.Status);
        Assert.Equal(0m, (await MineAsync(_farmer)).Savings.Mine);

        // The phone approves it: MoneyService marks the payment paid.
        await using (var db = database.CreateContext())
        {
            var stored = db.Payments.Single(p => p.Reference == payment.Reference);
            stored.Status = PaymentStatus.Paid;
            await db.SaveChangesAsync();
        }

        var mine = await MineAsync(_farmer);
        Assert.Equal(20m, mine.Savings.Mine);
        Assert.Equal(20m, mine.Savings.Group);
        Assert.Equal(0m, (await MineAsync(_leader)).Savings.Mine);
    }

    private sealed record PaymentInfoStub(string Reference, PaymentStatus Status);

    [Fact]
    public async Task Closed_orders_bad_bags_and_other_cooperatives_are_refused()
    {
        var id = await StartAsync();
        var mine = await MineAsync(_farmer);
        await using var db = database.CreateContext();

        var tooMany = await Assert.ThrowsAsync<ApiException>(() =>
            UpdateOrder.Handle(mine.OpenOrder!.Id, new UpdateBagsRequest(501), db, FarmerSession(_farmer), _clock, CancellationToken.None));
        Assert.Equal("BAGS_INVALID", tooMany.MessageKey);

        _clock.Advance(TimeSpan.FromDays(6));
        var closed = await Assert.ThrowsAsync<ApiException>(() =>
            UpdateOrder.Handle(mine.OpenOrder!.Id, new UpdateBagsRequest(1), db, FarmerSession(_farmer), _clock, CancellationToken.None));
        Assert.Equal("ORDER_CLOSED", closed.MessageKey);

        var outsider = await Assert.ThrowsAsync<ApiException>(() => MineAsync(_othersFarmer));
        Assert.Equal("NOT_IN_A_COOPERATIVE", outsider.MessageKey);
        var notTheirs = await Assert.ThrowsAsync<ApiException>(() =>
            UpdateRsvp.Handle(Guid.NewGuid(), new RsvpRequest(true), db, FarmerSession(_farmer), CancellationToken.None));
        Assert.Equal("MEETING_NOT_FOUND", notTheirs.MessageKey);
        var noSale = await Assert.ThrowsAsync<ApiException>(() =>
            UpdateSale.Handle(Guid.NewGuid(), new UpdateBagsRequest(1), db, FarmerSession(_farmer), CancellationToken.None));
        Assert.Equal("SALE_NOT_FOUND", noSale.MessageKey);
        var noOrder = await Assert.ThrowsAsync<ApiException>(() =>
            UpdateOrder.Handle(Guid.NewGuid(), new UpdateBagsRequest(1), db, FarmerSession(_farmer), _clock, CancellationToken.None));
        Assert.Equal("ORDER_NOT_FOUND", noOrder.MessageKey);

        var otherOfficer = await Assert.ThrowsAsync<ApiException>(() =>
            CreateMeeting.Handle(id, new CreateMeetingRequest(_clock.UtcNow.AddDays(1), "x", "y", null), db, As(_otherOfficer.Id), _clock, CancellationToken.None));
        Assert.Equal("COOPERATIVE_NOT_FOUND", otherOfficer.MessageKey);
    }

    [Fact]
    public async Task Officers_only_add_their_own_farmers_once_with_full_details()
    {
        var id = await StartAsync();
        await using var db = database.CreateContext();
        var notOwned = await Assert.ThrowsAsync<ApiException>(() =>
            AddCooperativeMember.Handle(id, new AddMemberRequest(_othersFarmer.Id), db, Officer, _clock, CancellationToken.None));
        Assert.Equal("MEMBER_NOT_OWNED", notOwned.MessageKey);
        var twice = await Assert.ThrowsAsync<ApiException>(() =>
            AddCooperativeMember.Handle(id, new AddMemberRequest(_farmer.Id), db, Officer, _clock, CancellationToken.None));
        Assert.Equal("MEMBER_ALREADY_IN_COOPERATIVE", twice.MessageKey);
        var leaderTaken = await Assert.ThrowsAsync<ApiException>(() =>
            CreateCooperative.Handle(new CreateCooperativeRequest("Second", "Tolon", _farmer.Id), db, Officer, _clock, CancellationToken.None));
        Assert.Equal("MEMBER_ALREADY_IN_COOPERATIVE", leaderTaken.MessageKey);
        var blank = await Assert.ThrowsAsync<ApiException>(() =>
            CreateCooperative.Handle(new CreateCooperativeRequest(" ", "Tolon", _leader.Id), db, Officer, _clock, CancellationToken.None));
        Assert.Equal("COOPERATIVE_DETAILS_REQUIRED", blank.MessageKey);
        var pastOrder = await Assert.ThrowsAsync<ApiException>(() => CreateOrder.Handle(
            id, new CreateOrderRequest("Seed", "Dealer", 10m, 12m, 10, DateOnly.FromDateTime(_clock.UtcNow.UtcDateTime).AddDays(-1)),
            db, Officer, _clock, CancellationToken.None));
        Assert.Equal("COOPERATIVE_DETAILS_REQUIRED", pastOrder.MessageKey);
        var freeSale = await Assert.ThrowsAsync<ApiException>(() =>
            CreateSale.Handle(id, new CreateSaleRequest("Maize", "Buyer", 0m, 0m, 100), db, Officer, _clock, CancellationToken.None));
        Assert.Equal("COOPERATIVE_DETAILS_REQUIRED", freeSale.MessageKey);
        var farmerIsNotOfficer = await Assert.ThrowsAsync<ApiException>(() =>
            GetOfficerCooperatives.Handle(db, As(_admin.Id), _clock, CancellationToken.None));
        Assert.Equal("NOT_AN_OFFICER_ACCOUNT", farmerIsNotOfficer.MessageKey);

        var list = (await GetOfficerCooperatives.Handle(db, Officer, _clock, CancellationToken.None)).Value!;
        Assert.Equal("Tolon Women Farmers", Assert.Single(list).Name);
    }

    [Fact]
    public async Task The_admin_sees_cooperatives_in_their_area_and_reminds_members_who_have_not_pledged()
    {
        var id = await StartAsync();
        var mine = await MineAsync(_farmer);
        await using (var db = database.CreateContext())
        {
            await UpdateOrder.Handle(mine.OpenOrder!.Id, new UpdateBagsRequest(3), db, FarmerSession(_farmer), _clock, CancellationToken.None);
            await UpdateSale.Handle(mine.OpenSale!.Id, new UpdateBagsRequest(2), db, FarmerSession(_farmer), CancellationToken.None);
        }

        await using (var db = database.CreateContext())
        {
            var all = (await GetAdminCooperatives.Handle(db, As(_admin.Id), _clock, CancellationToken.None)).Value!;
            var coop = Assert.Single(all);
            Assert.Equal(3, Assert.Single(coop.Orders).OrderedBags);
            Assert.Equal(1, coop.Orders[0].Members);
            Assert.Equal(200, coop.Cooperative.OpenSale!.PledgedKg);
            Assert.Empty((await GetAdminCooperatives.Handle(db, As(_farAdmin.Id), _clock, CancellationToken.None)).Value!);

            var reminded = (await RemindPledges.Handle(id, db, As(_admin.Id), NullLogger<RemindPledges>.Instance, CancellationToken.None)).Value!;
            Assert.Equal(1, reminded.Members);
            var officerOnly = await Assert.ThrowsAsync<ApiException>(() =>
                GetAdminCooperatives.Handle(db, Officer, _clock, CancellationToken.None));
            Assert.Equal("NOT_AN_ADMIN_ACCOUNT", officerOnly.MessageKey);
            var noSale = await Assert.ThrowsAsync<ApiException>(() =>
                RemindPledges.Handle(Guid.NewGuid(), db, As(_admin.Id), NullLogger<RemindPledges>.Instance, CancellationToken.None));
            Assert.Equal("SALE_NOT_FOUND", noSale.MessageKey);
        }
    }
}

public sealed class CooperativeServiceExtensionTests
{
    [Fact]
    public void Registers_every_cooperative_endpoint()
    {
        var services = new Microsoft.Extensions.DependencyInjection.ServiceCollection();
        services.AddCooperativeService();
        Assert.Equal(13, services.Count(s => s.ServiceType == typeof(AgroConnect.SharedLibrary.Features.IFeature)));
    }
}
