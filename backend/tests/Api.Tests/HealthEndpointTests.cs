using System.Net;
using System.Text.Json;
using Testcontainers.PostgreSql;

namespace AgroConnect.Api.Tests;

/// <summary>Health with a real PostgreSQL in a container (needs Docker running).</summary>
[IntegrationTest]
public sealed class HealthEndpointTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine").Build();
    private ApiFactory _factory = null!;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        _factory = new ApiFactory(_postgres.GetConnectionString());
    }

    public async Task DisposeAsync()
    {
        await _factory.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    [Fact]
    public async Task Health_is_ok_when_the_database_answers()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/health", CancellationToken.None);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync(CancellationToken.None));
        Assert.Equal("ok", body.RootElement.GetProperty("status").GetString());
        Assert.Equal("Healthy", body.RootElement.GetProperty("checks").GetProperty("database").GetString());
    }
}
