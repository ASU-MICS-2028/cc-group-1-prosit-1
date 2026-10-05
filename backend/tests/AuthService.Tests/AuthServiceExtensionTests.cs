using AgroConnect.Data;
using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Features;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace AgroConnect.AuthService.Tests;

[UnitTest]
public sealed class AuthServiceExtensionTests
{
    private static WebApplication Build(string signingKey)
    {
        var builder = WebApplication.CreateSlimBuilder();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?> { ["Auth:SigningKey"] = signingKey });
        builder.Services.AddSharedLibrary().AddData(builder.Configuration).AddAuthService(builder.Configuration);
        return builder.Build();
    }

    [Fact]
    public void Maps_the_sign_in_endpoints()
    {
        var app = Build(TestSettings.SigningKey);

        app.MapFeatures();

        var routes = ((IEndpointRouteBuilder)app).DataSources
            .SelectMany(source => source.Endpoints)
            .OfType<RouteEndpoint>()
            .Select(endpoint => endpoint.RoutePattern.RawText)
            .ToList();
        Assert.Contains("/api/auth/code", routes);
        Assert.Contains("/api/auth/verify", routes);
        Assert.Contains("/api/me", routes);
    }

    [Fact]
    public void Refuses_a_short_signing_key()
    {
        var app = Build("too-short");

        var error = Assert.Throws<OptionsValidationException>(() => app.Services.GetRequiredService<IOptions<AuthOptions>>().Value);
        Assert.Contains("Auth:SigningKey", error.Message, StringComparison.Ordinal);
    }
}
