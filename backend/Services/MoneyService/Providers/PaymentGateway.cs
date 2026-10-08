using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Providers.Interfaces;

namespace AgroConnect.MoneyService.Providers;

/// <summary>Settings under "Paystack". The secret key comes from user-secrets on a laptop and an environment variable on the servers, never from a committed file.</summary>
public sealed class PaystackOptions
{
    /// <summary>"sk_test_..." or "sk_live_...". Empty: the sample provider is used instead.</summary>
    public string SecretKey { get; set; } = string.Empty;

    public string BaseUrl { get; set; } = "https://api.paystack.co";

    /// <summary>Paystack needs an email for every customer; farmers have none, so each gets "farmer-{id}@{this}".</summary>
    public string CustomerEmailDomain { get; set; } = "farmers.agroconnect.app";
}

/// <summary>What the provider says about a payment.</summary>
public sealed record GatewayResult(PaymentStatus Status, string? Message);

/// <summary>The mobile money provider. Paystack today; another provider (MTN MoMo API) is another class.</summary>
public interface IPaymentGateway
{
    /// <summary>False for the sample provider: the app labels its answers "Sample data".</summary>
    bool IsLive { get; }

    /// <summary>Registers the wallet so money can be sent to it (Get paid). Returns the provider's id, or null if refused.</summary>
    Task<string?> CreateRecipientAsync(string name, string localPhone, MobileNetwork network, CancellationToken cancellationToken);

    /// <summary>Asks the network to charge the wallet; the farmer approves on their phone.</summary>
    Task<GatewayResult> ChargeAsync(
        string reference, long amountPesewas, string email, string localPhone, MobileNetwork network, CancellationToken cancellationToken);

    /// <summary>Sends the one-time code some networks text to the farmer.</summary>
    Task<GatewayResult> SubmitCodeAsync(string reference, string code, CancellationToken cancellationToken);

    /// <summary>Asks how the payment stands now.</summary>
    Task<GatewayResult> CheckAsync(string reference, CancellationToken cancellationToken);
}

/// <summary>Paystack's API for Ghana mobile money: charges (GHS, pesewas), one-time codes, verification and payout recipients.</summary>
public sealed class PaystackGateway(HttpClient http) : IPaymentGateway
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public bool IsLive => true;

    /// <summary>Paystack's names for the networks: lower case for charges, upper case for payout recipients.</summary>
    public static string ChargeCode(MobileNetwork network) => network switch
    {
        MobileNetwork.Mtn => "mtn",
        MobileNetwork.Telecel => "vod",
        MobileNetwork.AirtelTigo => "atl",
        _ => throw new ArgumentOutOfRangeException(nameof(network)),
    };

    public static void Configure(HttpClient client, PaystackOptions options)
    {
        client.BaseAddress = new Uri(options.BaseUrl.TrimEnd('/') + "/");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", options.SecretKey);
        client.Timeout = TimeSpan.FromSeconds(30);
    }

    public async Task<string?> CreateRecipientAsync(string name, string localPhone, MobileNetwork network, CancellationToken cancellationToken)
    {
        var body = new
        {
            type = "mobile_money",
            name,
            account_number = localPhone,
            bank_code = ChargeCode(network).ToUpperInvariant(),
            currency = "GHS",
        };
        var reply = await SendAsync(HttpMethod.Post, "transferrecipient", body, cancellationToken);
        return reply.Ok && reply.Data.TryGetProperty("recipient_code", out var code) ? code.GetString() : null;
    }

    public async Task<GatewayResult> ChargeAsync(
        string reference, long amountPesewas, string email, string localPhone, MobileNetwork network, CancellationToken cancellationToken)
    {
        var body = new
        {
            email,
            amount = amountPesewas,
            currency = "GHS",
            reference,
            mobile_money = new { phone = localPhone, provider = ChargeCode(network) },
        };
        return ToResult(await SendAsync(HttpMethod.Post, "charge", body, cancellationToken));
    }

    public async Task<GatewayResult> SubmitCodeAsync(string reference, string code, CancellationToken cancellationToken) =>
        ToResult(await SendAsync(HttpMethod.Post, "charge/submit_otp", new { otp = code, reference }, cancellationToken));

    public async Task<GatewayResult> CheckAsync(string reference, CancellationToken cancellationToken) =>
        ToResult(await SendAsync(HttpMethod.Get, $"transaction/verify/{Uri.EscapeDataString(reference)}", null, cancellationToken));

    /// <summary>Paystack's payment statuses in our words.</summary>
    public static PaymentStatus StatusFrom(string? status) => status switch
    {
        "success" => PaymentStatus.Paid,
        "send_otp" => PaymentStatus.NeedsCode,
        "failed" or "abandoned" or "reversed" => PaymentStatus.Failed,
        // pay_offline (approve on the phone), pending, ongoing, processing, queued
        _ => PaymentStatus.Waiting,
    };

    private static GatewayResult ToResult(Reply reply)
    {
        if (!reply.Ok)
        {
            return new GatewayResult(PaymentStatus.Failed, reply.Message);
        }

        var status = reply.Data.TryGetProperty("status", out var s) ? s.GetString() : null;
        var text = reply.Data.TryGetProperty("display_text", out var d) && d.ValueKind == JsonValueKind.String
            ? d.GetString()
            : reply.Data.TryGetProperty("gateway_response", out var g) && g.ValueKind == JsonValueKind.String
                ? g.GetString()
                : reply.Message;
        return new GatewayResult(StatusFrom(status), text);
    }

    private sealed record Reply(bool Ok, JsonElement Data, string? Message);

    private async Task<Reply> SendAsync(HttpMethod method, string path, object? body, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(method, path);
        if (body is not null)
        {
            request.Content = JsonContent.Create(body, options: Json);
        }

        using var response = await http.SendAsync(request, cancellationToken);
        var text = await response.Content.ReadAsStringAsync(cancellationToken);
        try
        {
            using var document = JsonDocument.Parse(text);
            var root = document.RootElement;
            var ok = response.IsSuccessStatusCode && root.TryGetProperty("status", out var s) && s.ValueKind == JsonValueKind.True;
            var message = root.TryGetProperty("message", out var m) ? m.GetString() : null;
            var data = root.TryGetProperty("data", out var d) ? d.Clone() : default;
            return new Reply(ok && data.ValueKind == JsonValueKind.Object, data, message);
        }
        catch (JsonException)
        {
            return new Reply(false, default, $"Payment provider answered {(int)response.StatusCode}");
        }
    }
}

/// <summary>
/// Stand-in when no Paystack key is set (tests, CI, a laptop without the key): a charge waits, and is paid
/// once checked a few seconds later, like a farmer approving on their phone. The app shows "Sample data".
/// </summary>
public sealed class SamplePaymentGateway(IClock clock) : IPaymentGateway
{
    public static readonly TimeSpan ApproveAfter = TimeSpan.FromSeconds(5);

    private readonly ConcurrentDictionary<string, DateTimeOffset> _charged = new();

    public bool IsLive => false;

    public Task<string?> CreateRecipientAsync(string name, string localPhone, MobileNetwork network, CancellationToken cancellationToken) =>
        Task.FromResult<string?>($"RCP_sample_{localPhone[^4..]}");

    public Task<GatewayResult> ChargeAsync(
        string reference, long amountPesewas, string email, string localPhone, MobileNetwork network, CancellationToken cancellationToken)
    {
        _charged[reference] = clock.UtcNow;
        return Task.FromResult(new GatewayResult(PaymentStatus.Waiting, "Sample: approve the payment on your phone."));
    }

    public Task<GatewayResult> SubmitCodeAsync(string reference, string code, CancellationToken cancellationToken) =>
        CheckAsync(reference, cancellationToken);

    public Task<GatewayResult> CheckAsync(string reference, CancellationToken cancellationToken) =>
        Task.FromResult(_charged.TryGetValue(reference, out var at) && clock.UtcNow - at >= ApproveAfter
            ? new GatewayResult(PaymentStatus.Paid, "Sample: approved.")
            : new GatewayResult(PaymentStatus.Waiting, "Sample: approve the payment on your phone."));
}
