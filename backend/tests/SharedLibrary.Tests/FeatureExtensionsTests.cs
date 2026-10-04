using AgroConnect.SharedLibrary.Features;
using AgroConnect.SharedLibrary.Messages;
using AgroConnect.SharedLibrary.Providers.Implementations;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace AgroConnect.SharedLibrary.Tests;

[UnitTest]
public class FeatureExtensionsTests
{
    private sealed class PingFeature : IFeature
    {
        public void MapEndpoint(IEndpointRouteBuilder app) => app.MapGet("/ping", () => "pong");
    }

    [Fact]
    public void Every_registered_feature_is_mapped()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Services.AddFeature<PingFeature>();
        using var app = builder.Build();

        app.MapFeatures();

        var routes = ((IEndpointRouteBuilder)app).DataSources.SelectMany(source => source.Endpoints).OfType<RouteEndpoint>();
        Assert.Contains(routes, endpoint => endpoint.RoutePattern.RawText == "/ping");
    }

    [Fact]
    public void The_shared_library_registers_its_services()
    {
        using var services = new ServiceCollection().AddSharedLibrary().BuildServiceProvider();

        Assert.IsType<SystemClock>(services.GetRequiredService<IClock>());
        Assert.NotNull(services.GetRequiredService<IMessageProvider>());
    }

    [Fact]
    public void The_clock_reports_utc_now()
    {
        var before = DateTimeOffset.UtcNow;

        var now = new SystemClock().UtcNow;

        Assert.InRange(now, before, DateTimeOffset.UtcNow);
    }
}
