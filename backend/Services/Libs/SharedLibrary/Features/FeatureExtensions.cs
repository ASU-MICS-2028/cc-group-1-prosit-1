using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace AgroConnect.SharedLibrary.Features;

public static class FeatureExtensions
{
    public static IServiceCollection AddFeature<TFeature>(this IServiceCollection services)
        where TFeature : class, IFeature
        => services.AddSingleton<IFeature, TFeature>();

    /// <summary>Maps every registered feature. The API host calls this once.</summary>
    public static IEndpointRouteBuilder MapFeatures(this IEndpointRouteBuilder app)
    {
        foreach (var feature in app.ServiceProvider.GetServices<IFeature>())
        {
            feature.MapEndpoint(app);
        }

        return app;
    }
}
