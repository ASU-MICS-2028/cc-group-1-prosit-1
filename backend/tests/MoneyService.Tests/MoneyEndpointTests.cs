using AgroConnect.Data;
using AgroConnect.Data.Entities;
using AgroConnect.MoneyService.Features;
using AgroConnect.MoneyService.Models;
using AgroConnect.MoneyService.Providers;
using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using NSubstitute;

namespace AgroConnect.MoneyService.Tests;

[CollectionDefinition(Name)]
public sealed class DatabaseCollection : ICollectionFixture<PostgresFixture>
{
    public const string Name = "database";
}

[IntegrationTest]
[Collection(DatabaseCollection.Name)]
public sealed class MoneyEndpointTests(PostgresFixture database) : IAsyncLifetime
{
    private readonly TestClock _clock = new();
    private readonly ISessionProvider _session = Substitute.For<ISessionProvider>();
    private readonly IOptions<PaystackOptions> _options = Options.Create(new PaystackOptions());
    private SamplePaymentGateway _sample = null!;
    private Farmer _farmer = null!;

    public async Task InitializeAsync()
    {
        await database.ResetAsync();
        _sample = new SamplePaymentGateway(_clock);
        _farmer = await AddFarmerAsync("+233241000001");
        _session.FarmerId.Returns(_farmer.Id);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<Farmer> AddFarmerAsync(string? phone)
    {
        await using var db = database.CreateContext();
        var officer = new AppUser
        {
            Id = Guid.CreateVersion7(),
            Role = UserRole.Officer,
            PhoneE164 = $"+23324000{Random.Shared.Next(1000, 9999)}",
            FullName = "Fuseini Alhassan",
            CreatedAt = _clock.UtcNow,
        };
        var farmer = new Farmer
        {
            Id = Guid.CreateVersion7(),
            RegisteredById = officer.Id,
            FullName = "Ama Boateng",
            PhoneE164 = phone,
            HasNoPhone = phone is null,
            Crops = [Crop.Maize],
            CreatedAt = _clock.UtcNow,
        };
        db.Users.Add(officer);
        db.Farmers.Add(farmer);
        await db.SaveChangesAsync();
        return farmer;
    }

    private async Task<WalletInfo> LinkAsync(MobileNetwork network = MobileNetwork.Mtn, IPaymentGateway? gateway = null)
    {
        await using var db = database.CreateContext();
        return (await LinkWallet.Handle(new LinkWalletRequest(network), db, _session, gateway ?? _sample, _clock, CancellationToken.None)).Value!;
    }

    private async Task<PaymentInfo> PayAsync(decimal amount = 545m, string description = "Tolon Agro Inputs", IPaymentGateway? gateway = null)
    {
        await using var db = database.CreateContext();
        return (await StartPayment.Handle(
            new PayRequest(PaymentPurpose.Inputs, description, amount), db, _session, gateway ?? _sample, _clock, _options, CancellationToken.None)).Value!;
    }

    private async Task<PaymentInfo> CheckAsync(string reference, IPaymentGateway? gateway = null)
    {
        await using var db = database.CreateContext();
        return (await GetPayment.Handle(reference, db, _session, gateway ?? _sample, _clock, CancellationToken.None)).Value!;
    }

    [Fact]
    public async Task Links_the_registered_phone_on_the_chosen_network_and_can_change_it()
    {
        var linked = await LinkAsync();
        var changed = await LinkAsync(MobileNetwork.Telecel);

        Assert.Equal(new WalletInfo(MobileNetwork.Mtn, "+233241000001", "Ama Boateng", true), linked);
        Assert.Equal(MobileNetwork.Telecel, changed.Network);
        await using var db = database.CreateContext();
        var wallet = await db.Wallets.SingleAsync();
        Assert.Equal("RCP_sample_0001", wallet.RecipientCode);
    }

    [Fact]
    public async Task A_farmer_without_a_phone_or_a_refused_wallet_cannot_link()
    {
        var gateway = Substitute.For<IPaymentGateway>();
        gateway.CreateRecipientAsync(default!, default!, default, default).ReturnsForAnyArgs((string?)null);

        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "WALLET_NOT_ACCEPTED", () => LinkAsync(gateway: gateway));

        var noPhone = await AddFarmerAsync(null);
        _session.FarmerId.Returns(noPhone.Id);
        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "NO_PHONE_FOR_WALLET", () => LinkAsync());
    }

    [Fact]
    public async Task A_payment_waits_for_approval_on_the_phone_then_is_paid()
    {
        await LinkAsync();

        var started = await PayAsync(545.5m);

        Assert.Equal(PaymentStatus.Waiting, started.Status);
        Assert.Equal(545.5m, started.Amount);
        Assert.StartsWith("agc_", started.Reference, StringComparison.Ordinal);
        Assert.Equal(PaymentStatus.Waiting, (await CheckAsync(started.Reference)).Status);

        _clock.Advance(SamplePaymentGateway.ApproveAfter);
        var paid = await CheckAsync(started.Reference);

        Assert.Equal(PaymentStatus.Paid, paid.Status);
        await using var db = database.CreateContext();
        var stored = await db.Payments.SingleAsync();
        Assert.Equal(54550, stored.AmountPesewas);
        Assert.Equal(PaymentStatus.Paid, stored.Status);
        // A settled payment is not asked about again.
        var gateway = Substitute.For<IPaymentGateway>();
        Assert.Equal(PaymentStatus.Paid, (await CheckAsync(started.Reference, gateway)).Status);
        await gateway.DidNotReceiveWithAnyArgs().CheckAsync(default!, default);
    }

    [Fact]
    public async Task The_network_may_ask_for_a_code_which_the_farmer_sends()
    {
        await LinkAsync(MobileNetwork.Telecel);
        var gateway = Substitute.For<IPaymentGateway>();
        gateway.ChargeAsync(default!, default, default!, default!, default, default)
            .ReturnsForAnyArgs(new GatewayResult(PaymentStatus.NeedsCode, "Enter the code sent to your phone"));
        gateway.CheckAsync(default!, default).ReturnsForAnyArgs(new GatewayResult(PaymentStatus.Waiting, "pending"));
        gateway.SubmitCodeAsync(default!, default!, default).ReturnsForAnyArgs(new GatewayResult(PaymentStatus.Paid, "Approved"));

        var started = await PayAsync(gateway: gateway);
        // Still waiting at the provider: the code stays needed.
        var checkedAgain = await CheckAsync(started.Reference, gateway);
        await using var db = database.CreateContext();
        var sent = (await SendPaymentCode.Handle(
            started.Reference, new PaymentCodeRequest(" 123456 "), db, _session, gateway, _clock, CancellationToken.None)).Value!;

        Assert.Equal(PaymentStatus.NeedsCode, started.Status);
        Assert.Equal("Enter the code sent to your phone", started.Message);
        Assert.Equal(PaymentStatus.NeedsCode, checkedAgain.Status);
        Assert.Equal(PaymentStatus.Paid, sent.Status);
        await gateway.Received(1).SubmitCodeAsync(started.Reference, "123456", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task A_failed_check_is_saved_with_the_reason()
    {
        await LinkAsync();
        var gateway = Substitute.For<IPaymentGateway>();
        gateway.ChargeAsync(default!, default, default!, default!, default, default)
            .ReturnsForAnyArgs(new GatewayResult(PaymentStatus.Waiting, "Approve on your phone"));
        gateway.CheckAsync(default!, default).ReturnsForAnyArgs(new GatewayResult(PaymentStatus.Failed, new string('x', 400)));
        var started = await PayAsync(gateway: gateway);

        var failed = await CheckAsync(started.Reference, gateway);

        Assert.Equal(PaymentStatus.Failed, failed.Status);
        Assert.Equal(300, failed.Message!.Length);
    }

    [Theory]
    [InlineData(0.5, "Seeds", "AMOUNT_INVALID")]
    [InlineData(10_001, "Seeds", "AMOUNT_INVALID")]
    [InlineData(10, "  ", "DESCRIPTION_REQUIRED")]
    public async Task A_payment_must_have_a_sensible_amount_and_a_description(decimal amount, string description, string key)
    {
        await LinkAsync();

        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, key, () => PayAsync(amount, description));
    }

    [Fact]
    public async Task Paying_needs_a_linked_wallet_and_a_code_needs_digits()
    {
        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "NO_WALLET", () => PayAsync());

        await using var db = database.CreateContext();
        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "CODE_REQUIRED", () =>
            SendPaymentCode.Handle("agc_x", new PaymentCodeRequest(""), db, _session, _sample, _clock, CancellationToken.None));
        await ApiAssert.FailsAsync(StatusCodes.Status404NotFound, "PAYMENT_NOT_FOUND", () =>
            SendPaymentCode.Handle("agc_x", new PaymentCodeRequest("1234"), db, _session, _sample, _clock, CancellationToken.None));
    }

    [Fact]
    public async Task A_farmer_sees_only_their_own_payments_newest_first_and_whether_it_is_a_sample()
    {
        await LinkAsync();
        var first = await PayAsync(description: "Seeds");
        _clock.Advance(TimeSpan.FromMinutes(1));
        var second = await PayAsync(description: "Fertiliser");
        var other = await AddFarmerAsync("+233241000002");

        await using (var db = database.CreateContext())
        {
            var overview = (await GetMoney.Handle(db, _session, _sample, CancellationToken.None)).Value!;
            Assert.True(overview.Sample);
            Assert.Equal("Ama Boateng", overview.Wallet!.NameOnWallet);
            Assert.Equal([second.Reference, first.Reference], overview.Payments.Select(p => p.Reference));
        }

        _session.FarmerId.Returns(other.Id);
        await ApiAssert.FailsAsync(StatusCodes.Status404NotFound, "PAYMENT_NOT_FOUND", () => CheckAsync(first.Reference));
        await using (var db = database.CreateContext())
        {
            var empty = (await GetMoney.Handle(db, _session, _sample, CancellationToken.None)).Value!;
            Assert.Null(empty.Wallet);
            Assert.Empty(empty.Payments);
        }
    }

    [Fact]
    public async Task Only_farmers_with_a_record_use_money()
    {
        _session.FarmerId.Returns((Guid?)null);
        await ApiAssert.FailsAsync(StatusCodes.Status403Forbidden, "NOT_A_FARMER_ACCOUNT", () => LinkAsync());

        _session.FarmerId.Returns(Guid.CreateVersion7());
        await ApiAssert.FailsAsync(StatusCodes.Status404NotFound, "FARMER_NOT_FOUND", () => LinkAsync());
    }

    [Theory]
    [UnitTest]
    [InlineData("", typeof(SamplePaymentGateway))]
    [InlineData("sk_test_x", typeof(PaystackGateway))]
    public void The_key_decides_between_paystack_and_the_sample(string key, Type expected)
    {
        var builder = WebApplication.CreateSlimBuilder();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Default"] = "Host=localhost",
            ["Paystack:SecretKey"] = key,
        });
        builder.Services.AddSharedLibrary().AddData(builder.Configuration).AddMoneyService(builder.Configuration);
        var app = builder.Build();
        app.MapFeatures();

        using var scope = app.Services.CreateScope();
        Assert.IsType(expected, scope.ServiceProvider.GetRequiredService<IPaymentGateway>());
        var routes = ((IEndpointRouteBuilder)app).DataSources.SelectMany(s => s.Endpoints).OfType<RouteEndpoint>()
            .Select(e => e.RoutePattern.RawText);
        Assert.Contains("/api/money/payments/{reference}/code", routes);
    }
}
