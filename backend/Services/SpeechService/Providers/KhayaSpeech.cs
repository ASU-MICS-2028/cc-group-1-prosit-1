using System.Net.Http.Json;
using System.Text.Json;

namespace AgroConnect.SpeechService.Providers;

/// <summary>Settings for GhanaNLP Khaya. The key is a secret: user-secrets on a laptop, Khaya__ApiKey on a server.</summary>
public sealed class KhayaOptions
{
    public string? ApiKey { get; set; }

    public string BaseUrl { get; set; } = "https://translation-api.ghananlp.org";
}

/// <summary>Reads a sentence aloud in a Ghanaian language: translate from English, then synthesise.</summary>
public interface ISpeechProvider
{
    bool IsLive { get; }

    Task<SpokenText?> SpeakAsync(string english, string language, CancellationToken cancellationToken);
}

public sealed record SpokenText(string Translated, string ContentType, byte[] Audio);

/// <summary>No key: nothing to call. The endpoint answers "not available" and the app uses the phone's voice.</summary>
public sealed class NoSpeechProvider : ISpeechProvider
{
    public bool IsLive => false;

    public Task<SpokenText?> SpeakAsync(string english, string language, CancellationToken cancellationToken) =>
        Task.FromResult<SpokenText?>(null);
}

/// <summary>
/// GhanaNLP Khaya, current versions (v1 of both is deprecated): POST /v2/translate {"in", "lang": "en-tw"}
/// returns the text; POST /tts/v2/synthesize {"text", "language": "twi"} returns WAV audio. Same bodies as
/// v1, new paths (checked against the Khaya SDK). Authenticated with Ocp-Apim-Subscription-Key.
/// </summary>
public sealed class KhayaSpeechProvider(HttpClient http) : ISpeechProvider
{
    /// <summary>App language code to Khaya's translation pair target and TTS language.</summary>
    private static readonly Dictionary<string, (string Pair, string Voice)> Languages = new()
    {
        ["tw"] = ("en-tw", "twi"),
        ["ee"] = ("en-ee", "ewe"),
        ["dag"] = ("en-dag", "dag"),
    };

    public bool IsLive => true;

    public static void Configure(HttpClient client, KhayaOptions options)
    {
        client.BaseAddress = new Uri(options.BaseUrl.TrimEnd('/') + "/");
        client.Timeout = TimeSpan.FromSeconds(30);
        client.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", options.ApiKey);
        client.DefaultRequestHeaders.Add("Cache-Control", "no-cache");
    }

    public async Task<SpokenText?> SpeakAsync(string english, string language, CancellationToken cancellationToken)
    {
        if (!Languages.TryGetValue(language, out var codes))
        {
            return null;
        }

        using var translate = await http.PostAsJsonAsync("v2/translate", new { @in = english, lang = codes.Pair }, cancellationToken);
        if (!translate.IsSuccessStatusCode)
        {
            return null;
        }

        // The answer is a JSON string ("Me ho yɛ"), sometimes an object with the text in it.
        var body = await translate.Content.ReadAsStringAsync(cancellationToken);
        var translated = ReadText(body);
        if (string.IsNullOrWhiteSpace(translated))
        {
            return null;
        }

        using var tts = await http.PostAsJsonAsync("tts/v2/synthesize", new { text = translated, language = codes.Voice }, cancellationToken);
        var type = tts.Content.Headers.ContentType?.MediaType ?? "audio/wav";
        if (!tts.IsSuccessStatusCode || !type.StartsWith("audio/", StringComparison.Ordinal))
        {
            return null;
        }

        var audio = await tts.Content.ReadAsByteArrayAsync(cancellationToken);
        return audio.Length == 0 ? null : new SpokenText(translated, type, audio);
    }

    public static string? ReadText(string body)
    {
        try
        {
            using var json = JsonDocument.Parse(body);
            return json.RootElement.ValueKind switch
            {
                JsonValueKind.String => json.RootElement.GetString(),
                JsonValueKind.Object when json.RootElement.TryGetProperty("translation", out var t) => t.GetString(),
                JsonValueKind.Object when json.RootElement.TryGetProperty("text", out var t) => t.GetString(),
                _ => null,
            };
        }
        catch (JsonException)
        {
            return body.Trim().Trim('"');
        }
    }
}
