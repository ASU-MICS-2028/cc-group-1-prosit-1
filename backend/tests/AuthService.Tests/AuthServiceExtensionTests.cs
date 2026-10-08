using AgroConnect.Data;
using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.SharedLibrary.Sms;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace AgroConnect.AuthService.Tests;

[UnitTest]
public sealed class AuthServiceExtensionTests
{
    private static WebApplication Build(string signingKey, string? tokenLifetime = null)
    {
        var builder = WebApplication.CreateSlimBuilder();
        var settings = new Dictionary<string, string?> { ["Auth:SigningKey"] = signingKey };
        if (tokenLifetime is not null)
        {
            settings["Auth:TokenLifetime"] = tokenLifetime; // left out = the default
        }

        builder.Configuration.AddInMemoryCollection(settings);
        builder.Services.AddSharedLibrary().AddSms(builder.Configuration).AddData(builder.Configuration).AddAuthService(builder.Configuration);
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

    [Theory]
    [InlineData(null, 7 * 24)]
    [InlineData("01:00:00", 1)]
    [InlineData("1.00:00:00", 24)]
    public void Reads_the_sign_in_lifetime(string? setting, int hours)
    {
        var app = Build(TestSettings.SigningKey, setting);

        Assert.Equal(TimeSpan.FromHours(hours), app.Services.GetRequiredService<IOptions<AuthOptions>>().Value.TokenLifetime);
    }

    [Theory]
    [InlineData("00:00:00")]
    [InlineData("-01:00:00")]
    public void Refuses_a_sign_in_lifetime_of_zero_or_less(string setting)
    {
        var app = Build(TestSettings.SigningKey, setting);

        var error = Assert.Throws<OptionsValidationException>(() => app.Services.GetRequiredService<IOptions<AuthOptions>>().Value);
        Assert.Contains("Auth:TokenLifetime", error.Message, StringComparison.Ordinal);
    }
}
