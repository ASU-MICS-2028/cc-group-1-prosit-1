using AgroConnect.PlatformService.Features;
using AgroConnect.SharedLibrary.Features;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace AgroConnect.PlatformService.Tests.Features;

[UnitTest]
public class GetSupportedLanguagesTests
{
    [Fact]
    public void Lists_all_four_languages_with_their_codes()
    {
        var languages = GetSupportedLanguages.Handle().Value!;

        Assert.Equal(["en", "tw", "ee", "dag"], languages.Select(l => l.Code));
        Assert.Equal(["English", "Twi", "Ewe", "Dagbani"], languages.Select(l => l.Name));
    }

    [Fact]
    public void The_service_registers_its_features_and_they_map_their_routes()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Services.AddPlatformService();
        using var app = builder.Build();

        var features = app.Services.GetServices<IFeature>().Select(f => f.GetType()).ToList();
        app.MapFeatures();

        Assert.Contains(typeof(GetHealth), features);
        Assert.Contains(typeof(GetSupportedLanguages), features);
        var routes = ((IEndpointRouteBuilder)app).DataSources
            .SelectMany(source => source.Endpoints)
            .OfType<RouteEndpoint>()
            .Select(endpoint => endpoint.RoutePattern.RawText)
            .ToList();
        Assert.Contains("/health", routes);
        Assert.Contains("/languages", routes);
    }
}
