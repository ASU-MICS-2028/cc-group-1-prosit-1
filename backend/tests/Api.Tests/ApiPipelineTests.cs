using System.Net;
using System.Text.Json;

namespace AgroConnect.Api.Tests;

/// <summary>Behaviour that needs no database: the failure paths and the error format.</summary>
[IntegrationTest]
public sealed class ApiPipelineTests : IAsyncLifetime
{
    // Nothing listens on port 1, so the database check fails fast.
    private readonly ApiFactory _factory = new("Host=127.0.0.1;Port=1;Database=none;Username=none;Password=none;Timeout=2");

    public Task InitializeAsync() => Task.CompletedTask;

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task Health_is_503_when_the_database_is_unreachable()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/health", CancellationToken.None);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync(CancellationToken.None));
        Assert.Equal("unhealthy", body.RootElement.GetProperty("status").GetString());
        Assert.Equal("Unhealthy", body.RootElement.GetProperty("checks").GetProperty("database").GetString());
    }

    [Fact]
    public async Task Languages_lists_the_four_supported_languages()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/languages", CancellationToken.None);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync(CancellationToken.None));
        Assert.Equal(["en", "tw", "ee", "dag"], body.RootElement.EnumerateArray().Select(l => l.GetProperty("code").GetString()));
    }

    [Fact]
    public async Task Feature_failures_return_problem_details_with_the_message_for_the_callers_language()
    {
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Language", "tw"); // no Twi text yet: falls back to English

        var response = await client.GetAsync("/test/not-found", CancellationToken.None);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync(CancellationToken.None));
        Assert.Equal("NOT_FOUND", body.RootElement.GetProperty("title").GetString());
        Assert.Equal("We could not find what you asked for.", body.RootElement.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Unknown_routes_return_problem_details()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/no-such-route", CancellationToken.None);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }
}
