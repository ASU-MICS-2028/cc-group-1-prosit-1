using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace AgroConnect.Api.Tests;

/// <summary>Sign-in through HTTP against the seeded database, the way the app does it.</summary>
[IntegrationTest]
[Collection(SeededApiCollection.Name)]
public sealed class SignInFlowTests(SeededApiFixture api)
{
    [Fact]
    public async Task Officer_signs_in_and_reads_their_profile()
    {
        var (client, user) = await api.SignInAsync("024 000 0001", "officer");
        using (client)
        {
            Assert.Equal("officer", user.GetProperty("role").GetString());
            Assert.Equal(SeededApiFixture.OfficerPhone, user.GetProperty("phone").GetString());

            var me = await client.GetFromJsonAsync<JsonElement>("/api/me", SeededApiFixture.Json);

            Assert.Equal("Fuseini Alhassan", me.GetProperty("fullName").GetString());
            Assert.Equal("Savelugu", me.GetProperty("district").GetString());
        }
    }

    [Fact]
    public async Task Sample_farmer_signs_in_with_their_own_account()
    {
        var (client, user) = await api.SignInAsync(SeededApiFixture.FarmerPhone, "farmer");
        using (client)
        {
            Assert.Equal("farmer", user.GetProperty("role").GetString());
            Assert.Equal(SeededApiFixture.SampleFarmerId, user.GetProperty("farmerId").GetGuid());
            Assert.Equal("Ama Boateng", user.GetProperty("fullName").GetString());
        }
    }

    [Fact]
    public async Task Request_code_answers_202_with_the_timings()
    {
        using var client = api.Factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/code", new { phone = "0550000000", role = "officer" }, SeededApiFixture.Json);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(SeededApiFixture.Json);
        Assert.Equal(600, body.GetProperty("expiresInSeconds").GetInt32());
    }

    [Fact]
    public async Task Wrong_code_is_a_problem_in_the_callers_language()
    {
        using var client = api.Factory.CreateClient();
        await client.PostAsJsonAsync("/api/auth/code", new { phone = "0240000001", role = "officer" }, SeededApiFixture.Json);

        var response = await client.PostAsJsonAsync("/api/auth/verify", new { phone = "0240000001", role = "officer", code = "000000" }, SeededApiFixture.Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(SeededApiFixture.Json);
        Assert.Equal("CODE_WRONG", problem.GetProperty("title").GetString());
    }

    [Fact]
    public async Task An_unknown_role_is_a_bad_request()
    {
        using var client = api.Factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/code", new { phone = "0240000001", role = "superuser" }, SeededApiFixture.Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("not-a-token")]
    public async Task Me_without_a_valid_token_is_401(string? token)
    {
        using var client = api.Factory.CreateClient();
        if (token is not null)
        {
            client.DefaultRequestHeaders.Authorization = new("Bearer", token);
        }

        var response = await client.GetAsync("/api/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
