using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using AgroConnect.Data.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;

namespace AgroConnect.Api.Tests;

[CollectionDefinition(Name)]
public sealed class SeededApiCollection : ICollectionFixture<SeededApiFixture>
{
    public const string Name = "seeded-api";
}

/// <summary>
/// The API as it runs on a laptop: it migrates an empty PostgreSQL on start-up and seeds the demo
/// officer and sample farmer from configuration.
/// </summary>
public sealed class SeededApiFixture : IAsyncLifetime
{
    public const string OfficerPhone = "+233240000001";
    public const string FarmerPhone = "+233240001234";
    public const string AdminPhone = "+233240000009";
    public static readonly Guid SampleFarmerId = Guid.Parse("0192f0a0-0000-7000-8000-000000000001");

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17-alpine").Build();

    public ApiFactory Factory { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        Factory = new ApiFactory(_postgres.GetConnectionString(), new Dictionary<string, string>
        {
            ["Database:MigrateOnStartup"] = "true",
            ["Seed:Officers:0:FullName"] = "Fuseini Alhassan",
            ["Seed:Officers:0:Phone"] = "024 000 0001",
            ["Seed:Officers:0:Region"] = "Northern",
            ["Seed:Officers:0:District"] = "Savelugu",
            ["Seed:Officers:1:FullName"] = "Not a phone number",
            ["Seed:Officers:1:Phone"] = "12345",
            ["Seed:Officers:2:FullName"] = "Abena Mensah",
            ["Seed:Officers:2:Phone"] = "024 000 0002",
            ["Seed:Admins:0:FullName"] = "Esi Owusu",
            ["Seed:Admins:0:Phone"] = AdminPhone,
            ["Seed:Admins:0:Region"] = "Northern",
            ["Seed:SampleFarmer"] = "true",
            // Tests sign in many times from one address and phone; the limits themselves are tested elsewhere.
            ["Auth:RateLimitPerWindow"] = "1000",
            ["Auth:ResendCooldownSeconds"] = "0",
            ["Auth:MaxCodesPerHour"] = "1000",
        });

        // Start the host, then wait for the background migration and seed to finish.
        using var _ = Factory.CreateClient();
        var deadline = DateTime.UtcNow.AddSeconds(60);
        while (true)
        {
            await using var scope = Factory.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            try
            {
                if (await db.Farmers.AnyAsync())
                {
                    return;
                }
            }
            catch (Npgsql.PostgresException)
            {
                // Tables not created yet.
            }

            if (DateTime.UtcNow > deadline)
            {
                throw new TimeoutException("The API did not migrate and seed the database in time.");
            }

            await Task.Delay(250);
        }
    }

    public async Task DisposeAsync()
    {
        await Factory.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    /// <summary>Signs in through the real endpoints and returns a client that sends the token.</summary>
    public async Task<(HttpClient Client, JsonElement User)> SignInAsync(string phone, string role)
    {
        var client = Factory.CreateClient();
        var requested = await client.PostAsJsonAsync("/api/auth/code", new { phone, role }, Json);
        requested.EnsureSuccessStatusCode();

        var verified = await client.PostAsJsonAsync("/api/auth/verify", new { phone, role, code = ApiFactory.FixedCode }, Json);
        verified.EnsureSuccessStatusCode();
        using var body = JsonDocument.Parse(await verified.Content.ReadAsStringAsync());
        var token = body.RootElement.GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return (client, body.RootElement.GetProperty("user").Clone());
    }
}
