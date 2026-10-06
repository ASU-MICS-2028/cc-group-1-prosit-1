using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Features;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace AgroConnect.Api.Tests;

/// <summary>Starts the real API in memory, pointed at the database we give it.</summary>
public sealed class ApiFactory(string connectionString, IReadOnlyDictionary<string, string>? settings = null) : WebApplicationFactory<Program>
{
    public static readonly string SigningKey = TestSettings.SigningKey;
    public const string FixedCode = "123456";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Default", connectionString);
        builder.UseSetting("Auth:SigningKey", SigningKey);
        builder.UseSetting("Auth:FixedCode", FixedCode);
        foreach (var (key, value) in settings ?? new Dictionary<string, string>())
        {
            builder.UseSetting(key, value);
        }

        // Fail on wiring mistakes (a singleton using a per-request service) the way Development does, not only on a laptop.
        builder.UseDefaultServiceProvider(options =>
        {
            options.ValidateScopes = true;
            options.ValidateOnBuild = true;
        });

        builder.ConfigureServices(services => services.AddFeature<NotFoundFeature>());
    }

    /// <summary>A route that fails the way a real feature does, to test the error path end to end.</summary>
    private sealed class NotFoundFeature : IFeature
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/test/not-found", IResult () => throw new ApiException(StatusCodes.Status404NotFound, "NOT_FOUND"));
    }
}
