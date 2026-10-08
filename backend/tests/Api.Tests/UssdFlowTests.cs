using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace AgroConnect.Api.Tests;

/// <summary>USSD end to end (ADR 0038): Arkesel calls our endpoint for each key, without any sign-in.</summary>
[IntegrationTest]
[Collection(SeededApiCollection.Name)]
public sealed class UssdFlowTests(SeededApiFixture api)
{
    private static async Task<JsonElement> PressAsync(HttpClient client, string userData, bool newSession) =>
        await (await client.PostAsJsonAsync("/api/ussd/arkesel", new
        {
            sessionID = "e2e-1",
            userID = "agroconnect",
            newSession,
            msisdn = "233240001234",
            userData,
            network = "MTN",
        })).Content.ReadFromJsonAsync<JsonElement>();

    [Fact]
    public async Task The_sample_farmer_dials_in_and_gets_their_officers_number()
    {
        using var client = api.Factory.CreateClient();

        var menu = await PressAsync(client, "*928*1#", newSession: true);
        var officer = await PressAsync(client, "4", newSession: false);

        Assert.Equal("e2e-1", menu.GetProperty("sessionID").GetString());
        Assert.Equal("233240001234", menu.GetProperty("msisdn").GetString());
        Assert.True(menu.GetProperty("continueSession").GetBoolean());
        Assert.StartsWith("Akwaaba Ama!", menu.GetProperty("message").GetString(), StringComparison.Ordinal);
        Assert.False(officer.GetProperty("continueSession").GetBoolean());
        Assert.Equal("Your officer: Fuseini Alhassan, 024 000 0001. Call them any time.", officer.GetProperty("message").GetString());
    }

    [Fact]
    public async Task Needs_no_sign_in()
    {
        using var client = api.Factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/ussd/arkesel", new { sessionID = "e2e-2", newSession = true, msisdn = "233559999999", userData = "*928#" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
