using AgroConnect.FarmerService.Features;
using AgroConnect.FarmerService.Providers.Interfaces;
using AgroConnect.FarmerService.Providers.Samples;
using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Features;
using Microsoft.Extensions.DependencyInjection;

namespace AgroConnect.FarmerService;

public static class FarmerServiceExtension
{
    /// <summary>
    /// The farmer's own data and the farm services. Each outside source is a provider: swap a Sample* class
    /// for a live one here and nothing else changes (ADR 0031).
    /// </summary>
    public static IServiceCollection AddFarmerService(this IServiceCollection services)
    {
        services.AddSingleton<IMarketPriceProvider, SampleMarketPriceProvider>();
        services.AddSingleton<IWeatherProvider, SampleWeatherProvider>();
        services.AddSingleton<ICropAdviser, SampleCropAdviser>();
        services.AddSingleton<IHarvestForecaster, SampleHarvestForecaster>();
        services.AddSingleton<ICooperativeDirectory, SampleCooperativeDirectory>();
        services.AddSingleton<ILessonCatalogue, SampleLessonCatalogue>();
        services.AddSingleton<IChangeRequestInbox, LogOnlyChangeRequestInbox>();

        return services
            .AddMessages(typeof(FarmerServiceExtension).Assembly)
            .AddFeature<GetMyFarm>()
            .AddFeature<GetPrices>()
            .AddFeature<GetWeather>()
            .AddFeature<CheckCrop>()
            .AddFeature<GetHarvestForecast>()
            .AddFeature<GetCooperative>()
            .AddFeature<GetLessons>()
            .AddFeature<RequestChange>()
            .AddFeature<GetAlerts>()
            .AddFeature<SaveAlerts>();
    }
}
