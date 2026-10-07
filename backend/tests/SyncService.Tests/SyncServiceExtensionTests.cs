using AgroConnect.Data;
using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Features;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;

namespace AgroConnect.SyncService.Tests;

[UnitTest]
public sealed class SyncServiceExtensionTests
{
    [Fact]
    public void Maps_the_sync_endpoint()
    {
        var builder = WebApplication.CreateSlimBuilder();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?> { ["ConnectionStrings:Default"] = "Host=localhost" });
        builder.Services.AddSharedLibrary().AddData(builder.Configuration).AddSyncService();
        var app = builder.Build();

        app.MapFeatures();

        var routes = ((IEndpointRouteBuilder)app).DataSources
            .SelectMany(source => source.Endpoints)
            .OfType<RouteEndpoint>()
            .Select(endpoint => endpoint.RoutePattern.RawText);
        Assert.Contains("/api/sync", routes);
    }
}
