using System.Threading.RateLimiting;
using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.SpeechService.Features;
using AgroConnect.SpeechService.Providers;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace AgroConnect.SpeechService;

public static class SpeechServiceExtension
{
    public const string RateLimitPolicy = "speech";

    /// <summary>
    /// Speaker buttons in Ghanaian languages (ADR 0036). With "Khaya:ApiKey" set (user-secrets on a laptop,
    /// Khaya__ApiKey on a server) sentences go through GhanaNLP Khaya; without it the endpoint says "not
    /// available" and the app falls back to the phone's voice.
    /// </summary>
    public static IServiceCollection AddSpeechService(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<KhayaOptions>().Bind(configuration.GetSection("Khaya"));
        services.AddSingleton<NoSpeechProvider>();
        services.AddHttpClient<KhayaSpeechProvider>((provider, client) =>
            KhayaSpeechProvider.Configure(client, provider.GetRequiredService<IOptions<KhayaOptions>>().Value));
        services.AddScoped<ISpeechProvider>(provider =>
            string.IsNullOrWhiteSpace(provider.GetRequiredService<IOptions<KhayaOptions>>().Value.ApiKey)
                ? provider.GetRequiredService<NoSpeechProvider>()
                : provider.GetRequiredService<KhayaSpeechProvider>());

        // 60 sentences a minute per address: plenty for a person, too few to drain the paid key.
        services.AddRateLimiter(limiter => limiter.AddPolicy(RateLimitPolicy, context =>
            RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 60, Window = TimeSpan.FromMinutes(1) })));

        return services
            .AddMessages(typeof(SpeechServiceExtension).Assembly)
            .AddFeature<GetSpeech>();
    }
}
