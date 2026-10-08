using System.Net;
using System.Text;
using System.Text.Json;
using AgroConnect.MoneyService.Providers;
using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.MoneyService.Tests;

/// <summary>Paystack's side, faked: records each request and answers with the JSON Paystack sends.</summary>
internal sealed class FakePaystack(HttpStatusCode status, string json) : HttpMessageHandler
{
    public List<(HttpMethod Method, string Path, string? Auth, JsonElement? Body)> Requests { get; } = [];

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        JsonElement? body = request.Content is null
            ? null
            : JsonDocument.Parse(await request.Content.ReadAsStringAsync(cancellationToken)).RootElement.Clone();
        Requests.Add((request.Method, request.RequestUri!.PathAndQuery, request.Headers.Authorization?.ToString(), body));
        return new HttpResponseMessage(status) { Content = new StringContent(json, Encoding.UTF8, "application/json") };
    }
}

[UnitTest]
public sealed class PaystackGatewayTests
{
    private static (PaystackGateway Gateway, FakePaystack Paystack) Create(string json, HttpStatusCode status = HttpStatusCode.OK)
    {
        var paystack = new FakePaystack(status, json);
        var http = new HttpClient(paystack);
        PaystackGateway.Configure(http, new PaystackOptions { SecretKey = "sk_test_x", BaseUrl = "https://api.paystack.test" });
        return (new PaystackGateway(http), paystack);
    }

    [Fact]
    public async Task Charges_ghana_mobile_money_in_pesewas_with_the_networks_code()
    {
        var (gateway, paystack) = Create("""{"status":true,"message":"Charge attempted","data":{"status":"pay_offline","display_text":"Please complete authorization process on your mobile phone"}}""");

        var result = await gateway.ChargeAsync("agc_1", 54500, "farmer-1@x.app", "0201234567", MobileNetwork.Telecel, CancellationToken.None);

        Assert.Equal(new GatewayResult(PaymentStatus.Waiting, "Please complete authorization process on your mobile phone"), result);
        var (method, path, auth, body) = Assert.Single(paystack.Requests);
        Assert.Equal(HttpMethod.Post, method);
        Assert.Equal("/charge", path);
        Assert.Equal("Bearer sk_test_x", auth);
        Assert.Equal(54500, body!.Value.GetProperty("amount").GetInt64());
        Assert.Equal("GHS", body.Value.GetProperty("currency").GetString());
        Assert.Equal("agc_1", body.Value.GetProperty("reference").GetString());
        Assert.Equal("farmer-1@x.app", body.Value.GetProperty("email").GetString());
        Assert.Equal("0201234567", body.Value.GetProperty("mobile_money").GetProperty("phone").GetString());
        Assert.Equal("vod", body.Value.GetProperty("mobile_money").GetProperty("provider").GetString());
    }

    [Theory]
    [InlineData("success", PaymentStatus.Paid)]
    [InlineData("send_otp", PaymentStatus.NeedsCode)]
    [InlineData("pay_offline", PaymentStatus.Waiting)]
    [InlineData("ongoing", PaymentStatus.Waiting)]
    [InlineData("failed", PaymentStatus.Failed)]
    [InlineData("abandoned", PaymentStatus.Failed)]
    [InlineData("reversed", PaymentStatus.Failed)]
    public void Paystack_statuses_in_our_words(string paystack, PaymentStatus ours) =>
        Assert.Equal(ours, PaystackGateway.StatusFrom(paystack));

    [Theory]
    [InlineData(MobileNetwork.Mtn, "mtn")]
    [InlineData(MobileNetwork.Telecel, "vod")]
    [InlineData(MobileNetwork.AirtelTigo, "atl")]
    public void Network_codes(MobileNetwork network, string code) => Assert.Equal(code, PaystackGateway.ChargeCode(network));

    [Fact]
    public void An_unknown_network_is_a_bug() =>
        Assert.Throws<ArgumentOutOfRangeException>(() => PaystackGateway.ChargeCode((MobileNetwork)9));

    [Fact]
    public async Task A_refusal_is_a_failed_payment_with_paystacks_message()
    {
        var (gateway, _) = Create("""{"status":false,"message":"Invalid phone number"}""", HttpStatusCode.BadRequest);

        var result = await gateway.ChargeAsync("agc_2", 100, "e@x.app", "0241", MobileNetwork.Mtn, CancellationToken.None);

        Assert.Equal(new GatewayResult(PaymentStatus.Failed, "Invalid phone number"), result);
    }

    [Fact]
    public async Task A_declined_charge_gives_paystacks_own_reason()
    {
        var (gateway, _) = Create("""{"status":false,"message":"Charge attempted","data":{"status":"failed","message":"Declined. Please use the test mobile money number since you are doing a test transaction."}}""", HttpStatusCode.BadRequest);

        var result = await gateway.ChargeAsync("agc_9", 100, "e@x.app", "0240001234", MobileNetwork.Mtn, CancellationToken.None);

        Assert.Equal(PaymentStatus.Failed, result.Status);
        Assert.StartsWith("Declined. Please use the test mobile money number", result.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task An_answer_that_is_not_json_is_a_failed_payment()
    {
        var (gateway, _) = Create("<html>Bad gateway</html>", HttpStatusCode.BadGateway);

        var result = await gateway.CheckAsync("agc_3", CancellationToken.None);

        Assert.Equal(new GatewayResult(PaymentStatus.Failed, "Payment provider answered 502"), result);
    }

    [Fact]
    public async Task Verifies_by_reference_and_reads_the_gateway_response()
    {
        var (gateway, paystack) = Create("""{"status":true,"message":"Verification successful","data":{"status":"success","gateway_response":"Approved"}}""");

        var result = await gateway.CheckAsync("agc 4", CancellationToken.None);

        Assert.Equal(new GatewayResult(PaymentStatus.Paid, "Approved"), result);
        Assert.Equal("/transaction/verify/agc%204", paystack.Requests[0].Path);
    }

    [Fact]
    public async Task Sends_the_one_time_code()
    {
        var (gateway, paystack) = Create("""{"status":true,"message":"Charge attempted","data":{"status":"success"}}""");

        var result = await gateway.SubmitCodeAsync("agc_5", "123456", CancellationToken.None);

        Assert.Equal(PaymentStatus.Paid, result.Status);
        Assert.Equal("Charge attempted", result.Message);
        Assert.Equal("/charge/submit_otp", paystack.Requests[0].Path);
        Assert.Equal("123456", paystack.Requests[0].Body!.Value.GetProperty("otp").GetString());
    }

    [Fact]
    public async Task Registers_the_wallet_as_a_payout_recipient()
    {
        var (gateway, paystack) = Create("""{"status":true,"message":"Transfer recipient created","data":{"recipient_code":"RCP_abc"}}""");

        var code = await gateway.CreateRecipientAsync("Ama Boateng", "0241000001", MobileNetwork.Mtn, CancellationToken.None);

        Assert.Equal("RCP_abc", code);
        var body = paystack.Requests[0].Body!.Value;
        Assert.Equal("/transferrecipient", paystack.Requests[0].Path);
        Assert.Equal("mobile_money", body.GetProperty("type").GetString());
        Assert.Equal("MTN", body.GetProperty("bank_code").GetString());
        Assert.Equal("0241000001", body.GetProperty("account_number").GetString());
        Assert.Equal("GHS", body.GetProperty("currency").GetString());
        Assert.True(gateway.IsLive);
    }

    [Fact]
    public async Task A_refused_recipient_is_null()
    {
        var (gateway, _) = Create("""{"status":false,"message":"Account number is invalid"}""", HttpStatusCode.BadRequest);

        Assert.Null(await gateway.CreateRecipientAsync("Ama", "0241", MobileNetwork.Mtn, CancellationToken.None));
    }

    [Fact]
    public async Task The_sample_provider_waits_then_is_paid_like_a_farmer_approving()
    {
        var clock = new TestClock();
        var sample = new SamplePaymentGateway(clock);

        var started = await sample.ChargeAsync("agc_6", 100, "e", "0241000001", MobileNetwork.Mtn, CancellationToken.None);
        clock.Advance(SamplePaymentGateway.ApproveAfter);

        Assert.Equal(PaymentStatus.Waiting, started.Status);
        Assert.Equal(PaymentStatus.Paid, (await sample.SubmitCodeAsync("agc_6", "1", CancellationToken.None)).Status);
        Assert.Equal(PaymentStatus.Waiting, (await sample.CheckAsync("unknown", CancellationToken.None)).Status);
        Assert.Equal("RCP_sample_0001", await sample.CreateRecipientAsync("Ama", "0241000001", MobileNetwork.Mtn, CancellationToken.None));
        Assert.False(sample.IsLive);
    }
}
