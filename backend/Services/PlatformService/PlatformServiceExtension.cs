using AgroConnect.PlatformService.Features;
using AgroConnect.SharedLibrary.Features;
using Microsoft.Extensions.DependencyInjection;

namespace AgroConnect.PlatformService;

public static class PlatformServiceExtension
{
    public static IServiceCollection AddPlatformService(this IServiceCollection services)
    {
        return services
            .AddFeature<GetHealth>()
            .AddFeature<GetSupportedLanguages>();
    }
}
