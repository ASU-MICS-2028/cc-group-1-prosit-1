using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace AgroConnect.Api.Tests;

/// <summary>Offline registration end to end: the officer's phone syncs a new farmer, then that farmer signs in.</summary>
[IntegrationTest]
[Collection(SeededApiCollection.Name)]
public sealed class SyncFlowTests(SeededApiFixture api)
{
    private const string NewFarmerPhone = "+233245550101";

    [Fact]
    public async Task A_farmer_synced_from_the_officers_phone_can_sign_in_and_see_their_farm()
    {
        var (officer, officerUser) = await api.SignInAsync(SeededApiFixture.OfficerPhone, "officer");
        var farmerId = Guid.CreateVersion7();
        var registeredAt = DateTimeOffset.UtcNow.AddMinutes(-10);

        var sync = await officer.PostAsJsonAsync("/api/sync", new
        {
            farmers = new[]
            {
                new
                {
                    id = farmerId,
                    consentGiven = true,
                    consentAt = registeredAt,
                    language = "en",
                    fullName = "Abdul Rahman",
                    phoneE164 = NewFarmerPhone,
                    hasNoPhone = false,
                    community = "Kumbungu",
                    regionDistrict = "Northern · Kumbungu District",
                    crops = new[] { "rice" },
                    farmSize = 3,
                    farmSizeUnit = "acres",
                    plantingSeasons = new[] { "rainy" },
                    reachChannels = new[] { "sms" },
                    incomeSources = Array.Empty<string>(),
                    helpNeeded = new[] { "market_prices" },
                    registeredById = officerUser.GetProperty("id").GetString(),
                    createdAt = registeredAt,
                    clientUpdatedAt = registeredAt,
                },
            },
            visits = Array.Empty<object>(),
        });

        Assert.Equal(HttpStatusCode.OK, sync.StatusCode);
        var result = (await sync.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("results")[0];
        Assert.Equal(farmerId, result.GetProperty("id").GetGuid());
        Assert.Equal("created", result.GetProperty("outcome").GetString());

        var (farmer, _) = await api.SignInAsync(NewFarmerPhone, "farmer");
        var farm = await farmer.GetFromJsonAsync<JsonElement>("/api/farmer/me", SeededApiFixture.Json);
        Assert.Equal("Abdul Rahman", farm.GetProperty("farmer").GetProperty("fullName").GetString());
        Assert.Equal("Fuseini Alhassan", farm.GetProperty("officer").GetProperty("fullName").GetString());
    }

    [Fact]
    public async Task A_refused_record_is_explained_in_the_callers_language()
    {
        var (officer, _) = await api.SignInAsync(SeededApiFixture.OfficerPhone, "officer");
        var id = Guid.CreateVersion7();

        var sync = await officer.PostAsJsonAsync("/api/sync", new { farmers = new[] { new { id, consentGiven = false } } });

        var result = (await sync.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("results")[0];
        Assert.Equal("invalid", result.GetProperty("outcome").GetString());
        Assert.Equal("This record could not be read. Update the app, then open the record and save it again.", result.GetProperty("problem").GetString());
    }

    [Fact]
    public async Task Only_officers_can_sync()
    {
        var (farmer, _) = await api.SignInAsync(SeededApiFixture.FarmerPhone, "farmer");
        var anonymous = api.Factory.CreateClient();
        var batch = new { farmers = Array.Empty<object>(), visits = Array.Empty<object>() };

        Assert.Equal(HttpStatusCode.Forbidden, (await farmer.PostAsJsonAsync("/api/sync", batch)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsJsonAsync("/api/sync", batch)).StatusCode);
    }

    [Fact]
    public async Task A_body_that_is_not_a_batch_is_a_problem_response()
    {
        var (officer, _) = await api.SignInAsync(SeededApiFixture.OfficerPhone, "officer");

        var response = await officer.PostAsync("/api/sync", new StringContent("[]", System.Text.Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("SYNC_BODY_INVALID", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("title").GetString());
    }
}
