using AgroConnect.Data;
using AgroConnect.Data.Entities;
using AgroConnect.FarmerService;
using AgroConnect.FarmerService.Providers.Samples;
using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.SharedLibrary.Messages;
using AgroConnect.UssdService.Features;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace AgroConnect.UssdService.Tests;

[CollectionDefinition(Name)]
public sealed class DatabaseCollection : ICollectionFixture<PostgresFixture>
{
    public const string Name = "database";
}

[IntegrationTest]
[Collection(DatabaseCollection.Name)]
public sealed class UssdMenuTests(PostgresFixture database) : IAsyncLifetime
{
    private const string FarmerMsisdn = "233241000001";
    private readonly TestClock _clock = new();
    private readonly IMessageProvider _messages = new MessageProvider([new AssemblyMessageSource(typeof(UssdServiceExtension).Assembly)]);
    private AppUser _officer = null!;

    public async Task InitializeAsync()
    {
        await database.ResetAsync();
        _officer = new AppUser
        {
            Id = Guid.CreateVersion7(),
            Role = UserRole.Officer,
            PhoneE164 = "+233240000001",
            FullName = "Fuseini Alhassan",
            CreatedAt = _clock.UtcNow,
        };
        await using var db = database.CreateContext();
        db.Users.Add(_officer);
        db.Farmers.Add(new Farmer
        {
            Id = Guid.CreateVersion7(),
            RegisteredById = _officer.Id,
            FullName = "Ama Boateng",
            PhoneE164 = "+" + FarmerMsisdn,
            Community = "Tolon",
            Crops = [Crop.Groundnut, Crop.Maize],
            Language = Language.English,
            CreatedAt = _clock.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    /// <summary>One key press, the way the gateway sends it: a fresh request (and database context) every time.</summary>
    private async Task<UssdReply> PressAsync(string input, bool newSession = false, string session = "s1", string msisdn = FarmerMsisdn)
    {
        await using var db = database.CreateContext();
        var menu = new UssdMenu(db, _clock, _messages, new SampleMarketPriceProvider(_clock), new SampleWeatherProvider(_clock));
        return await menu.StepAsync(session, msisdn, newSession, input, CancellationToken.None);
    }

    private async Task<int> SessionsAsync()
    {
        await using var db = database.CreateContext();
        return await db.UssdSessions.CountAsync();
    }

    [Fact]
    public async Task An_unregistered_number_is_told_to_ask_their_officer_and_nothing_is_kept()
    {
        var reply = await PressAsync("*928*1#", newSession: true, msisdn: "233559999999");

        Assert.False(reply.Continue);
        Assert.StartsWith("AgroConnect: this number is not registered", reply.Message, StringComparison.Ordinal);
        Assert.Equal(0, await SessionsAsync());
    }

    [Fact]
    public async Task Dialling_greets_the_farmer_with_the_menu_and_remembers_the_session()
    {
        var reply = await PressAsync("*928*1#", newSession: true);

        Assert.True(reply.Continue);
        Assert.Equal("Akwaaba Ama!\n1 Market prices\n2 Weather\n3 Ask my officer\n4 My officer's number\n0 Exit", reply.Message);
        Assert.Equal(1, await SessionsAsync());
    }

    [Fact]
    public async Task Prices_list_the_farmers_crops_first_then_show_one_crop_and_end()
    {
        await PressAsync("*928*1#", newSession: true);

        var list = await PressAsync("1");
        var price = await PressAsync("2");

        Assert.True(list.Continue);
        Assert.StartsWith("Prices today (GHS/kg):\n1 Groundnut\n2 Maize\n", list.Message, StringComparison.Ordinal);
        Assert.False(price.Continue);
        Assert.Matches(@"^Maize: Tamale \d+\.\d\d, Savelugu \d+\.\d\d, Kumbungu \d+\.\d\d, Yendi \d+\.\d\d\. This week ([+-]\d+%|no change)\.$", price.Message);
        Assert.Equal(0, await SessionsAsync());
    }

    [Fact]
    public async Task Weather_gives_today_and_the_farm_advice()
    {
        await PressAsync("*928*1#", newSession: true);

        var reply = await PressAsync("2");

        Assert.False(reply.Continue);
        Assert.Matches(@"^Tolon today: [a-z ]+, \d+C, rain \d+%\.\n.+", reply.Message);
    }

    [Fact]
    public async Task Ask_my_officer_creates_a_help_request_for_their_officer()
    {
        await PressAsync("*928*1#", newSession: true);
        Assert.StartsWith("Ask your officer about:", (await PressAsync("3")).Message, StringComparison.Ordinal);

        var reply = await PressAsync("2");

        Assert.Equal(new UssdReply("Sent to Fuseini Alhassan. They will call you soon.", false), reply);
        await using var db = database.CreateContext();
        var request = await db.HelpRequests.SingleAsync();
        Assert.Equal(HelpCategory.Money, request.Category);
        Assert.Equal(_officer.Id, request.OfficerId);
        Assert.Equal(HelpStatus.Waiting, request.Status);
        Assert.Equal("Asked by USSD. Please call the farmer back.", request.Text);
    }

    [Fact]
    public async Task My_officers_number_is_written_the_way_people_dial_it()
    {
        await PressAsync("*928*1#", newSession: true);

        Assert.Equal(new UssdReply("Your officer: Fuseini Alhassan, 024 000 0001. Call them any time.", false), await PressAsync("4"));
    }

    [Fact]
    public async Task A_wrong_key_shows_the_screen_again_and_0_goes_back_or_exits()
    {
        await PressAsync("*928*1#", newSession: true);

        var wrong = await PressAsync("9");
        await PressAsync("1");
        var wrongCrop = await PressAsync("7");
        var back = await PressAsync("0");
        await PressAsync("3");
        var wrongTopic = await PressAsync("x");
        await PressAsync("0");
        var bye = await PressAsync("0");

        Assert.StartsWith("Choose a number from the list.\nAkwaaba Ama!", wrong.Message, StringComparison.Ordinal);
        Assert.StartsWith("Choose a number from the list.\nPrices today", wrongCrop.Message, StringComparison.Ordinal);
        Assert.StartsWith("Akwaaba Ama!", back.Message, StringComparison.Ordinal);
        Assert.StartsWith("Choose a number from the list.\nAsk your officer", wrongTopic.Message, StringComparison.Ordinal);
        Assert.Equal(new UssdReply("Thank you for using AgroConnect.", false), bye);
        Assert.Equal(0, await SessionsAsync());
    }

    [Fact]
    public async Task An_unknown_session_starts_again_and_old_sessions_are_cleared()
    {
        await PressAsync("*928*1#", newSession: true, session: "old");
        _clock.Advance(UssdMenu.Forget + TimeSpan.FromMinutes(1));

        var reply = await PressAsync("1", session: "lost");

        Assert.StartsWith("Akwaaba Ama!", reply.Message, StringComparison.Ordinal);
        await using var db = database.CreateContext();
        Assert.Equal(["lost"], await db.UssdSessions.Select(u => u.SessionId).ToListAsync());
    }

    [Fact]
    public async Task A_session_whose_farmer_is_gone_ends()
    {
        await PressAsync("*928*1#", newSession: true);
        await using (var db = database.CreateContext())
        {
            var session = await db.UssdSessions.SingleAsync();
            session.FarmerId = Guid.CreateVersion7();
            await db.SaveChangesAsync();
        }

        var reply = await PressAsync("1");

        Assert.False(reply.Continue);
        Assert.StartsWith("AgroConnect: this number is not registered", reply.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("", true)]
    [InlineData("app-1", true)]
    [InlineData("someone-else", false)]
    public async Task Only_our_ussd_app_is_answered_when_its_id_is_set(string sent, bool answered)
    {
        await using var db = database.CreateContext();
        var menu = new UssdMenu(db, _clock, _messages, new SampleMarketPriceProvider(_clock), new SampleWeatherProvider(_clock));
        var options = Options.Create(new UssdOptions { UserId = sent == string.Empty ? null : "app-1" });
        var request = new ArkeselUssdRequest("s9", sent, true, FarmerMsisdn, "*928#", "MTN");

        if (answered)
        {
            var reply = (await ArkeselUssd.Handle(request, menu, options, CancellationToken.None)).Value!;
            Assert.Equal(("s9", FarmerMsisdn, true), (reply.SessionId, reply.Msisdn, reply.ContinueSession));
            Assert.StartsWith("Akwaaba Ama!", reply.Message, StringComparison.Ordinal);
        }
        else
        {
            await ApiAssert.FailsAsync(StatusCodes.Status403Forbidden, "USSD_WRONG_APP", () => ArkeselUssd.Handle(request, menu, options, CancellationToken.None));
        }
    }

    [Theory]
    [UnitTest]
    [InlineData("+233240000001", "024 000 0001")]
    [InlineData("+2332400", "02400")]
    public void Numbers_are_written_the_way_people_dial_them(string e164, string local) =>
        Assert.Equal(local, UssdMenu.LocalNumber(e164));

    [Fact]
    [UnitTest]
    public void Text_never_runs_past_one_screen()
    {
        Assert.Equal("short", UssdMenu.Fit("short"));
        var fitted = UssdMenu.Fit(new string('a', 300));
        Assert.Equal(UssdMenu.MaxLength, fitted.Length);
        Assert.EndsWith("...", fitted, StringComparison.Ordinal);
    }

    [Fact]
    [UnitTest]
    public void Maps_the_arkesel_callback()
    {
        var builder = WebApplication.CreateSlimBuilder();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?> { ["ConnectionStrings:Default"] = "Host=localhost" });
        builder.Services.AddSharedLibrary().AddData(builder.Configuration).AddFarmerService().AddUssdService(builder.Configuration);
        var app = builder.Build();
        app.MapFeatures();

        var routes = ((IEndpointRouteBuilder)app).DataSources.SelectMany(s => s.Endpoints).OfType<RouteEndpoint>()
            .Select(e => e.RoutePattern.RawText);
        Assert.Contains("/api/ussd/arkesel", routes);
    }
}
