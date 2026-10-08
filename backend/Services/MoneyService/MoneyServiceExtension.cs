using AgroConnect.MoneyService.Features;
using AgroConnect.MoneyService.Providers;
using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Features;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace AgroConnect.MoneyService;

public static class MoneyServiceExtension
{
    /// <summary>
    /// The farmer's mobile money (ADR 0034). With "Paystack:SecretKey" set (user-secrets on a laptop, the
    /// Paystack__SecretKey environment variable on a server) payments go through Paystack; without it, a
    /// labelled sample provider answers, so tests and CI never reach Paystack.
    /// </summary>
    public static IServiceCollection AddMoneyService(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<PaystackOptions>().Bind(configuration.GetSection("Paystack"));
        services.AddSingleton<SamplePaymentGateway>();
        services.AddHttpClient<PaystackGateway>((provider, client) =>
            PaystackGateway.Configure(client, provider.GetRequiredService<IOptions<PaystackOptions>>().Value));
        services.AddScoped<IPaymentGateway>(provider =>
            string.IsNullOrWhiteSpace(provider.GetRequiredService<IOptions<PaystackOptions>>().Value.SecretKey)
                ? provider.GetRequiredService<SamplePaymentGateway>()
                : provider.GetRequiredService<PaystackGateway>());

        return services
            .AddMessages(typeof(MoneyServiceExtension).Assembly)
            .AddFeature<GetMoney>()
            .AddFeature<LinkWallet>()
            .AddFeature<StartPayment>()
            .AddFeature<GetPayment>()
            .AddFeature<SendPaymentCode>();
    }
}
