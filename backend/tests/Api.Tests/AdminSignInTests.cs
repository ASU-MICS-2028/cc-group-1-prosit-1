using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace AgroConnect.Api.Tests;

/// <summary>MoFA admins (ADR 0024): seeded, signed in through the same code flow, kept apart from officers.</summary>
[IntegrationTest]
[Collection(SeededApiCollection.Name)]
public sealed class AdminSignInTests(SeededApiFixture api)
{
    [Fact]
    public async Task The_seeded_admin_signs_in_as_an_admin_for_their_region()
    {
        var (client, user) = await api.SignInAsync(SeededApiFixture.AdminPhone, "admin");

        Assert.Equal("admin", user.GetProperty("role").GetString());
        Assert.Equal("Esi Owusu", user.GetProperty("fullName").GetString());
        Assert.Equal("Northern", user.GetProperty("region").GetString());

        var me = await client.GetFromJsonAsync<JsonElement>("/api/me", SeededApiFixture.Json);
        Assert.Equal("admin", me.GetProperty("role").GetString());
    }

    [Fact]
    public async Task An_admin_cannot_use_the_officer_endpoints()
    {
        var (client, _) = await api.SignInAsync(SeededApiFixture.AdminPhone, "admin");

        var response = await client.PostAsJsonAsync("/api/sync", new { farmers = Array.Empty<object>(), visits = Array.Empty<object>() });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Every_seeded_officer_is_added_not_only_the_first()
    {
        var (_, user) = await api.SignInAsync("024 000 0002", "officer");

        Assert.Equal("Abena Mensah", user.GetProperty("fullName").GetString());
    }
}
