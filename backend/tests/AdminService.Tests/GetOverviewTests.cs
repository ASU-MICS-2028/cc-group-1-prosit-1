using AgroConnect.AdminService.Features;
using AgroConnect.Data;
using AgroConnect.Data.Entities;
using AgroConnect.Data.Persistence;
using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using AgroConnect.SharedLibrary.Sms;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using NSubstitute;

namespace AgroConnect.AdminService.Tests;

[CollectionDefinition(Name)]
public sealed class DatabaseCollection : ICollectionFixture<PostgresFixture>
{
    public const string Name = "database";
}

[IntegrationTest]
[Collection(DatabaseCollection.Name)]
public sealed class GetOverviewTests(PostgresFixture database) : IAsyncLifetime
{
    private readonly TestClock _clock = new(); // 1 Oct 2026, 09:00
    private readonly ISessionProvider _session = Substitute.For<ISessionProvider>();
    private int _phone;

    public async Task InitializeAsync() => await database.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<AppUser> AddUserAsync(UserRole role, string name, string? region, string? district)
    {
        var user = new AppUser
        {
            Id = Guid.CreateVersion7(),
            Role = role,
            PhoneE164 = $"+23324000{++_phone:0000}",
            FullName = name,
            Region = region,
            District = district,
            CreatedAt = _clock.UtcNow,
        };
        await using var db = database.CreateContext();
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private async Task AddFarmerAsync(AppUser officer, DateTimeOffset createdAt)
    {
        await using var db = database.CreateContext();
        db.Farmers.Add(new Farmer
        {
            Id = Guid.CreateVersion7(),
            RegisteredById = officer.Id,
            ConsentGiven = true,
            ConsentAt = createdAt,
            FullName = "A farmer",
            Crops = [Crop.Maize],
            FarmSize = 1,
            ClientUpdatedAt = createdAt,
            ServerUpdatedAt = createdAt,
            CreatedAt = createdAt,
        });
        await db.SaveChangesAsync();
    }

    private async Task<Data.Entities.Visit> AddVisitAsync(AppUser officer, DateTimeOffset at)
    {
        await using var db = database.CreateContext();
        var farmer = new Farmer
        {
            Id = Guid.CreateVersion7(),
            RegisteredById = officer.Id,
            FullName = "Visited farmer",
            Crops = [Crop.Yam],
            ClientUpdatedAt = at,
            ServerUpdatedAt = at.AddDays(-30),
            CreatedAt = at.AddDays(-30),
        };
        var visit = new Data.Entities.Visit
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
        db.Farmers.Add(farmer);
        db.Visits.Add(visit);
        await db.SaveChangesAsync();
        return visit;
    }

    private async Task<Models.AdminOverview> OverviewAsAsync(AppUser user)
    {
        _session.RequireUserId().Returns(user.Id);
        await using var db = database.CreateContext();
        return (await GetOverview.Handle(db, _session, _clock, CancellationToken.None)).Value!;
    }

    [Fact]
    public async Task A_region_admin_sees_only_the_officers_of_their_region_with_their_numbers()
    {
        var admin = await AddUserAsync(UserRole.Admin, "Esi Owusu", "Northern", null);
        var fuseini = await AddUserAsync(UserRole.Officer, "Fuseini Alhassan", "Northern", "Savelugu");
        var abena = await AddUserAsync(UserRole.Officer, "Abena Mensah", "Northern", "Tolon");
        var kofi = await AddUserAsync(UserRole.Officer, "Kofi Asante", "Ashanti", "Ejisu");
        await AddFarmerAsync(fuseini, _clock.UtcNow.AddHours(-1)); // this month
        await AddFarmerAsync(fuseini, _clock.UtcNow.AddDays(-5)); // last month
        await AddFarmerAsync(kofi, _clock.UtcNow.AddHours(-1)); // another region
        var visit = await AddVisitAsync(abena, _clock.UtcNow.AddMinutes(-30));

        var overview = await OverviewAsAsync(admin);

        Assert.Equal(new Models.AdminArea("Northern", null), overview.Area);
        Assert.Equal(["Abena Mensah", "Fuseini Alhassan"], overview.OfficerList.Select(o => o.FullName));
        Assert.Equal(2, overview.Officers);
        Assert.Equal(3, overview.Farmers); // Fuseini 2, Abena 1 (the visited farmer)
        Assert.Equal(1, overview.FarmersThisMonth);
        Assert.Equal(1, overview.VisitsThisMonth);
        var abenaLine = overview.OfficerList[0];
        Assert.Equal("Tolon", abenaLine.District);
        Assert.Equal(visit.ServerUpdatedAt, abenaLine.LastSyncAt);
        Assert.Equal(_clock.UtcNow.AddHours(-1), overview.OfficerList[1].LastSyncAt);
    }

    [Fact]
    public async Task A_district_admin_sees_one_district_and_a_national_admin_sees_all()
    {
        await AddUserAsync(UserRole.Officer, "Fuseini Alhassan", "Northern", "Savelugu");
        await AddUserAsync(UserRole.Officer, "Abena Mensah", "Northern", "Tolon");
        await AddUserAsync(UserRole.Officer, "Kofi Asante", "Ashanti", "Ejisu");
        var district = await AddUserAsync(UserRole.Admin, "District admin", "Northern", "Tolon");
        var national = await AddUserAsync(UserRole.Admin, "National admin", null, null);

        Assert.Equal(["Abena Mensah"], (await OverviewAsAsync(district)).OfficerList.Select(o => o.FullName));
        var all = await OverviewAsAsync(national);
        Assert.Equal(3, all.Officers);
        Assert.All(all.OfficerList, o => Assert.Null(o.LastSyncAt));
    }

    [Fact]
    public async Task An_officer_is_not_an_admin()
    {
        var officer = await AddUserAsync(UserRole.Officer, "Fuseini Alhassan", "Northern", "Savelugu");

        var error = await Assert.ThrowsAsync<ApiException>(() => OverviewAsAsync(officer));

        Assert.Equal(StatusCodes.Status403Forbidden, error.StatusCode);
        Assert.Equal("NOT_AN_ADMIN_ACCOUNT", error.MessageKey);
    }

    [Fact]
    [UnitTest]
    public void Maps_the_overview_endpoint()
    {
        var builder = WebApplication.CreateSlimBuilder();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?> { ["ConnectionStrings:Default"] = "Host=localhost" });
        builder.Services.AddSharedLibrary().AddSms(builder.Configuration).AddData(builder.Configuration).AddAdminService();
        var app = builder.Build();

        app.MapFeatures();

        var routes = ((IEndpointRouteBuilder)app).DataSources.SelectMany(s => s.Endpoints).OfType<RouteEndpoint>()
            .Select(e => e.RoutePattern.RawText);
        Assert.Contains("/api/admin/overview", routes);
        Assert.Contains("/api/admin/sms/test", routes);
    }
}
