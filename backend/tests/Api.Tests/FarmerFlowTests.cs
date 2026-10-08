using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace AgroConnect.Api.Tests;

/// <summary>The farmer app end to end: sign in as the sample farmer, then read their own farm and services.</summary>
[IntegrationTest]
[Collection(SeededApiCollection.Name)]
public sealed class FarmerFlowTests(SeededApiFixture api)
{
    [Fact]
    public async Task The_sample_farmer_reads_their_farm_their_officer_and_the_farm_services()
    {
        var (client, _) = await api.SignInAsync(SeededApiFixture.FarmerPhone, "farmer");

        var farm = await client.GetFromJsonAsync<JsonElement>("/api/farmer/me", SeededApiFixture.Json);
        Assert.Equal("Ama Boateng", farm.GetProperty("farmer").GetProperty("fullName").GetString());
        Assert.Equal("Fuseini Alhassan", farm.GetProperty("officer").GetProperty("fullName").GetString());

        foreach (var path in new[] { "/api/farmer/prices", "/api/farmer/weather", "/api/farmer/harvest-forecast", "/api/farmer/lessons" })
        {
            var answer = await client.GetFromJsonAsync<JsonElement>(path, SeededApiFixture.Json);
            Assert.Equal("sample", answer.GetProperty("source").GetString());
        }

        // The cooperative is live (ADR 0037): the seed puts the sample farmer in one with an open order.
        var coop = await client.GetFromJsonAsync<JsonElement>("/api/farmer/cooperative", SeededApiFixture.Json);
        Assert.Equal("live", coop.GetProperty("source").GetString());
        Assert.Equal("Tolon Farmers Cooperative", coop.GetProperty("name").GetString());
        var details = await client.GetFromJsonAsync<JsonElement>("/api/cooperative", SeededApiFixture.Json);
        Assert.Equal("NPK fertiliser 15-15-15", details.GetProperty("openOrder").GetProperty("product").GetString());

        var check = await client.PostAsJsonAsync("/api/farmer/crop-check", new { crop = "maize", symptoms = new[] { "holes_in_leaves" } });
        Assert.Equal(HttpStatusCode.OK, check.StatusCode);
        Assert.Equal("fall_armyworm", (await check.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("likelyProblem").GetString());

        var change = await client.PostAsJsonAsync("/api/farmer/change-requests", new { area = "phone", details = "New number 024 555 1234" });
        Assert.Equal(HttpStatusCode.Accepted, change.StatusCode);
    }

    [Fact]
    public async Task An_officer_cannot_open_the_farmer_endpoints()
    {
        var (client, _) = await api.SignInAsync("024 000 0001", "officer");

        var response = await client.GetAsync("/api/farmer/me");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task A_bad_crop_check_is_explained_in_the_callers_language()
    {
        var (client, _) = await api.SignInAsync(SeededApiFixture.FarmerPhone, "farmer");

        var response = await client.PostAsJsonAsync("/api/farmer/crop-check", new { crop = "maize", symptoms = Array.Empty<string>() });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("SYMPTOMS_REQUIRED", problem.GetProperty("title").GetString());
        Assert.Equal("Choose at least one thing you see on the crop.", problem.GetProperty("detail").GetString());
    }
}
