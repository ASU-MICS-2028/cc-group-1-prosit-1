using System.Net.Http.Json;
using System.Text.Json;
using AgroConnect.SharedLibrary.Helpers;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using AgroConnect.SharedLibrary.ValueObjects;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AgroConnect.SharedLibrary.Sms;

/// <summary>Settings under "Sms" (ADR 0037). The key comes from user-secrets on a laptop and Sms__ApiKey on a server.</summary>
public sealed class SmsOptions
{
    /// <summary>The Arkesel API key. Empty: messages only go to the log.</summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>The approved sender name the phone shows, at most 11 letters.</summary>
    public string SenderId { get; set; } = "AgroConnect";

    public string BaseUrl { get; set; } = "https://sms.arkesel.com";

    /// <summary>
    /// Production only: text every number. Off by default, so a laptop or staging server with a key never
    /// texts the demo accounts' made-up numbers, which belong to real people.
    /// </summary>
    public bool TextEveryone { get; set; }

    /// <summary>While TextEveryone is off, the only numbers ("+233...") that get a real SMS, e.g. the team's own phones.</summary>
    public List<string> OnlyTo { get; set; } = [];

    /// <summary>Arkesel sandbox: the request is checked but nothing is sent or charged.</summary>
    public bool Sandbox { get; set; }
}

/// <summary>Sends SMS through Arkesel's v2 API: POST /api/v2/sms/send with the "api-key" header.</summary>
public sealed partial class ArkeselSmsSender(
    HttpClient http,
    IOptions<SmsOptions> options,
    LogOnlySmsSender notTexted,
    ILogger<ArkeselSmsSender> logger) : ISmsSender
{
    public static void Configure(HttpClient client, SmsOptions options)
    {
        client.BaseAddress = new Uri(options.BaseUrl.TrimEnd('/') + "/");
        client.DefaultRequestHeaders.Add("api-key", options.ApiKey);
        client.Timeout = TimeSpan.FromSeconds(20);
    }

    public async Task<SmsResult> SendAsync(PhoneNumber to, string message, CancellationToken cancellationToken)
    {
        var settings = options.Value;
        if (!settings.TextEveryone && !settings.OnlyTo.Contains(to.E164))
        {
            return await notTexted.SendAsync(to, message, cancellationToken);
        }

        var body = new
        {
            sender = settings.SenderId,
            message,
            recipients = new[] { to.E164.TrimStart('+') },
            sandbox = settings.Sandbox,
        };

        string? problem;
        string? messageId = null;
        try
        {
            using var response = await http.PostAsJsonAsync("api/v2/sms/send", body, cancellationToken);
            var text = await response.Content.ReadAsStringAsync(cancellationToken);
            problem = Problem(response.IsSuccessStatusCode, text, (int)response.StatusCode);
            messageId = problem is null ? MessageId(text) : null;
        }
        catch (Exception error) when (error is HttpRequestException or TaskCanceledException)
        {
            problem = $"Arkesel could not be reached: {error.GetType().Name}";
        }

        if (problem is null)
        {
            LogSent(logger, DataMaskingHelper.MaskPhone(to.E164), messageId ?? "unknown");
            return new SmsResult(SmsOutcome.Sent);
        }

        LogFailed(logger, DataMaskingHelper.MaskPhone(to.E164), problem);
        return new SmsResult(SmsOutcome.Failed, problem);
    }

    /// <summary>Null when Arkesel accepted the message ("status": "success"), otherwise its reason.</summary>
    public static string? Problem(bool httpOk, string body, int statusCode)
    {
        try
        {
            using var document = JsonDocument.Parse(body);
            var root = document.RootElement;
            var status = root.TryGetProperty("status", out var s) ? s.ToString() : null;
            if (httpOk && status == "success")
            {
                return null;
            }

            return root.TryGetProperty("message", out var m) && m.ValueKind == JsonValueKind.String
                ? m.GetString()
                : $"Arkesel answered {statusCode}";
        }
        catch (JsonException)
        {
            return $"Arkesel answered {statusCode}";
        }
    }

    /// <summary>Arkesel's id for the message ("data": [{ "id": ... }]), to find its delivery report.</summary>
    public static string? MessageId(string body)
    {
        try
        {
            using var document = JsonDocument.Parse(body);
            return document.RootElement.TryGetProperty("data", out var data)
                && data.ValueKind == JsonValueKind.Array
                && data.GetArrayLength() > 0
                && data[0].TryGetProperty("id", out var id)
                ? id.GetString()
                : null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "SMS sent to {Phone}, Arkesel message {MessageId}")]
    private static partial void LogSent(ILogger logger, string phone, string messageId);

    [LoggerMessage(Level = LogLevel.Warning, Message = "SMS to {Phone} was not sent: {Problem}")]
    private static partial void LogFailed(ILogger logger, string phone, string problem);
}

public static class SmsSetup
{
    /// <summary>Arkesel when "Sms:ApiKey" is set, the log otherwise (tests, CI, a laptop without the key).</summary>
    public static IServiceCollection AddSms(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<SmsOptions>().Bind(configuration.GetSection("Sms"))
            .Validate(o => o.SenderId.Length is > 0 and <= 11, "Sms:SenderId must be 1 to 11 characters.");
        services.AddSingleton<LogOnlySmsSender>();
        services.AddHttpClient<ArkeselSmsSender>((provider, client) =>
            ArkeselSmsSender.Configure(client, provider.GetRequiredService<IOptions<SmsOptions>>().Value));
        services.AddTransient<ISmsSender>(provider =>
            string.IsNullOrWhiteSpace(provider.GetRequiredService<IOptions<SmsOptions>>().Value.ApiKey)
                ? provider.GetRequiredService<LogOnlySmsSender>()
                : provider.GetRequiredService<ArkeselSmsSender>());
        return services;
    }
}
