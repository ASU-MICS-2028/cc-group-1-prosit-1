using AgroConnect.AdminService.Features;
using AgroConnect.Data.Entities;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Messages;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using AgroConnect.SharedLibrary.ValueObjects;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using NSubstitute;

namespace AgroConnect.AdminService.Tests;

[IntegrationTest]
[Collection(DatabaseCollection.Name)]
public sealed class AddPersonTests(PostgresFixture database) : IAsyncLifetime
{
    private readonly TestClock _clock = new();
    private readonly ISessionProvider _session = Substitute.For<ISessionProvider>();
    private readonly ISmsSender _sms = Substitute.For<ISmsSender>();
    private readonly IMessageProvider _messages =
        new MessageProvider([new AssemblyMessageSource(typeof(AdminServiceExtension).Assembly)]);

    public async Task InitializeAsync()
    {
        await database.ResetAsync();
        _sms.SendAsync(default, default!, default).ReturnsForAnyArgs(new SmsResult(SmsOutcome.Sent));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<AppUser> AddAdminAsync(string? region, string? district = null)
    {
        var admin = new AppUser
        {
            Id = Guid.CreateVersion7(),
            Role = UserRole.Admin,
            PhoneE164 = "+233240000009",
            FullName = "Esi Owusu",
            Region = region,
            District = district,
            CreatedAt = _clock.UtcNow,
        };
        await using var db = database.CreateContext();
        db.Users.Add(admin);
        await db.SaveChangesAsync();
        _session.RequireUserId().Returns(admin.Id);
        return admin;
    }

    private static AddPersonRequest Officer(string phone = "024 555 0192", string? region = "Northern", string? district = "Tolon") =>
        new(UserRole.Officer, "  Amina Yakubu ", phone, region, district);

    private async Task<AddPersonResponse> AddAsync(AddPersonRequest request)
    {
        await using var db = database.CreateContext();
        return (await AddPerson.Handle(request, db, _session, _sms, _messages, _clock, CancellationToken.None)).Value!;
    }

    private async Task<AppUser> StoredAsync(Guid id)
    {
        await using var db = database.CreateContext();
        return await db.Users.SingleAsync(u => u.Id == id);
    }

    [Fact]
    public async Task Adds_an_officer_and_texts_them_an_invite()
    {
        await AddAdminAsync("Northern");

        var added = await AddAsync(Officer());

        Assert.Equal(SmsOutcome.Sent, added.Invite);
        var officer = await StoredAsync(added.Id);
        Assert.Equal((UserRole.Officer, "+233245550192", "Amina Yakubu", "Northern", "Tolon"),
            (officer.Role, officer.PhoneE164, officer.FullName, officer.Region, officer.District));
        Assert.Equal(_clock.UtcNow, officer.CreatedAt);
        await _sms.Received(1).SendAsync(
            PhoneNumber.Parse("+233245550192"),
            "Hello Amina Yakubu. Esi Owusu at MoFA added you to AgroConnect as an extension officer. Open AgroConnect and sign in with this phone number.",
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Adds_an_admin_for_the_whole_region_with_the_admin_invite()
    {
        await AddAdminAsync("Northern");

        var added = await AddAsync(new AddPersonRequest(UserRole.Admin, "Kwame Boateng", "054 000 0100", "northern", " "));

        var admin = await StoredAsync(added.Id);
        Assert.Equal((UserRole.Admin, "Northern", (string?)null), (admin.Role, admin.Region, admin.District));
        await _sms.Received(1).SendAsync(
            Arg.Any<PhoneNumber>(), Arg.Is<string>(text => text.Contains("as a MoFA admin")), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Keeps_the_account_and_says_so_when_the_invite_does_not_go()
    {
        await AddAdminAsync("Northern");
        _sms.SendAsync(default, default!, default).ReturnsForAnyArgs(new SmsResult(SmsOutcome.Failed, "Insufficient balance"));

        var added = await AddAsync(Officer());

        Assert.Equal(SmsOutcome.Failed, added.Invite);
        Assert.Equal("Amina Yakubu", (await StoredAsync(added.Id)).FullName);
    }

    [Fact]
    public async Task A_district_admin_adds_into_their_own_district_by_default()
    {
        await AddAdminAsync("Northern", "Tolon");

        var added = await AddAsync(Officer(region: null, district: null));

        var officer = await StoredAsync(added.Id);
        Assert.Equal(("Northern", "Tolon"), (officer.Region, officer.District));
    }

    [Fact]
    public async Task A_national_admin_picks_any_region_but_must_give_one()
    {
        await AddAdminAsync(region: null);

        var added = await AddAsync(Officer(region: "Volta", district: "Ho"));

        Assert.Equal("Volta", (await StoredAsync(added.Id)).Region);
        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "REGION_REQUIRED", () => AddAsync(Officer("024 555 0193", region: "")));
    }

    [Fact]
    public async Task Refuses_people_outside_the_admins_area()
    {
        await AddAdminAsync("Northern", "Tolon");

        await ApiAssert.FailsAsync(StatusCodes.Status403Forbidden, "OUTSIDE_YOUR_AREA", () => AddAsync(Officer(region: "Volta")));
        await ApiAssert.FailsAsync(StatusCodes.Status403Forbidden, "OUTSIDE_YOUR_AREA", () => AddAsync(Officer(district: "Savelugu")));
        await _sms.DidNotReceiveWithAnyArgs().SendAsync(default, default!, default);
    }

    [Fact]
    public async Task Refuses_a_number_already_used_for_that_role()
    {
        await AddAdminAsync("Northern");
        await AddAsync(Officer());

        await ApiAssert.FailsAsync(StatusCodes.Status409Conflict, "PHONE_TAKEN", () => AddAsync(Officer("+233 24 555 0192")));
        await _sms.ReceivedWithAnyArgs(1).SendAsync(default, default!, default);
    }

    [Fact]
    public async Task Checks_the_role_name_phone_and_district()
    {
        await AddAdminAsync("Northern");

        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "ROLE_NOT_ALLOWED",
            () => AddAsync(Officer() with { Role = UserRole.Farmer }));
        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "NAME_REQUIRED", () => AddAsync(Officer() with { FullName = " " }));
        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "TOO_LONG",
            () => AddAsync(Officer() with { FullName = new string('a', 101) }));
        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "INVALID_PHONE", () => AddAsync(Officer("12345")));
        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "DISTRICT_REQUIRED", () => AddAsync(Officer(district: null)));
    }

    [Fact]
    public async Task Only_an_admin_can_add_people()
    {
        _session.RequireUserId().Returns(Guid.CreateVersion7());

        await ApiAssert.FailsAsync(StatusCodes.Status403Forbidden, "NOT_AN_ADMIN_ACCOUNT", () => AddAsync(Officer()));
    }
}
