using AgroConnect.PlatformService.Features;
using AgroConnect.PlatformService.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace AgroConnect.PlatformService.Tests.Features;

[UnitTest]
public class GetHealthTests
{
    private sealed class FakeHealthCheckService(params (string Name, HealthStatus Status)[] checks) : HealthCheckService
    {
        public override Task<HealthReport> CheckHealthAsync(Func<HealthCheckRegistration, bool>? predicate, CancellationToken cancellationToken = default)
        {
            var entries = checks.ToDictionary(c => c.Name, c => new HealthReportEntry(c.Status, null, TimeSpan.Zero, null, null));
            return Task.FromResult(new HealthReport(entries, TimeSpan.Zero));
        }
    }

    [Fact]
    public async Task Is_ok_when_every_check_is_healthy()
    {
        var result = await GetHealth.Handle(new FakeHealthCheckService(("database", HealthStatus.Healthy)), CancellationToken.None);

        var ok = Assert.IsType<Ok<HealthResponse>>(result);
        Assert.Equal("ok", ok.Value!.Status);
        Assert.Equal("agroconnect-api", ok.Value.Service);
        Assert.Equal("Healthy", ok.Value.Checks["database"]);
    }

    [Fact]
    public async Task Is_503_when_a_check_fails()
    {
        var result = await GetHealth.Handle(new FakeHealthCheckService(("database", HealthStatus.Unhealthy)), CancellationToken.None);

        var json = Assert.IsType<JsonHttpResult<HealthResponse>>(result);
        Assert.Equal(503, json.StatusCode);
        Assert.Equal("unhealthy", json.Value!.Status);
        Assert.Equal("Unhealthy", json.Value.Checks["database"]);
    }
}
