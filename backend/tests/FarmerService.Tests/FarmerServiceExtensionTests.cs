using AgroConnect.Data;
using AgroConnect.FarmerService.Providers.Interfaces;
using AgroConnect.FarmerService.Providers.Samples;
using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Features;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AgroConnect.FarmerService.Tests;

[UnitTest]
public sealed class FarmerServiceExtensionTests
{
    [Fact]
    public void Maps_every_farmer_endpoint_with_the_sample_providers()
    {
        var builder = WebApplication.CreateSlimBuilder();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?> { ["ConnectionStrings:Default"] = "Host=localhost" });
        builder.Services.AddSharedLibrary().AddData(builder.Configuration).AddFarmerService();
        var app = builder.Build();

        app.MapFeatures();

        var routes = ((IEndpointRouteBuilder)app).DataSources
            .SelectMany(source => source.Endpoints)
            .OfType<RouteEndpoint>()
            .Select(endpoint => endpoint.RoutePattern.RawText)
            .ToList();
        foreach (var path in new[]
        {
            "/api/farmer/me", "/api/farmer/prices", "/api/farmer/weather", "/api/farmer/crop-check",
            "/api/farmer/harvest-forecast", "/api/farmer/cooperative", "/api/farmer/lessons", "/api/farmer/change-requests",
        })
        {
            Assert.Contains(path, routes);
        }

        Assert.IsType<SampleMarketPriceProvider>(app.Services.GetRequiredService<IMarketPriceProvider>());
        Assert.IsType<SampleWeatherProvider>(app.Services.GetRequiredService<IWeatherProvider>());
        Assert.IsType<LogOnlyChangeRequestInbox>(app.Services.GetRequiredService<IChangeRequestInbox>());
    }
}
