using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.UssdService.Features;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AgroConnect.UssdService;

public static class UssdServiceExtension
{
    /// <summary>The USSD menu and Arkesel's callback (ADR 0038). Uses the farm services registered by FarmerService.</summary>
    public static IServiceCollection AddUssdService(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<UssdOptions>().Bind(configuration.GetSection("Ussd"));
        services.AddScoped<UssdMenu>();
        return services
            .AddMessages(typeof(UssdServiceExtension).Assembly)
            .AddFeature<ArkeselUssd>();
    }
}
