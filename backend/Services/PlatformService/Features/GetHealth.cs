using AgroConnect.PlatformService.Models;
using AgroConnect.SharedLibrary.Features;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace AgroConnect.PlatformService.Features;

public sealed class GetHealth : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        // The deploy pipeline and uptime checks depend on this: 200 only when the API is up AND the database answers.
        app.MapGet("/health", Handle)
            .WithName("GetHealth")
            .WithTags("Platform")
            .Produces<HealthResponse>(StatusCodes.Status200OK)
            .Produces<HealthResponse>(StatusCodes.Status503ServiceUnavailable);
    }

    public static async Task<IResult> Handle([FromServices] HealthCheckService health, CancellationToken cancellationToken)
    {
        var report = await health.CheckHealthAsync(cancellationToken);
        var healthy = report.Status == HealthStatus.Healthy;
        var body = new HealthResponse(
            healthy ? "ok" : "unhealthy",
            "agroconnect-api",
            report.Entries.ToDictionary(entry => entry.Key, entry => entry.Value.Status.ToString()));

        return healthy
            ? TypedResults.Ok(body)
            : TypedResults.Json(body, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
}
