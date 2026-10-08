using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace AgroConnect.Api.Tests;

/// <summary>Mobile money end to end (ADR 0034). Tests have no Paystack key, so the labelled sample provider answers.</summary>
[IntegrationTest]
[Collection(SeededApiCollection.Name)]
public sealed class MoneyFlowTests(SeededApiFixture api)
{
    [Fact]
    public async Task The_farmer_links_their_wallet_pays_and_sees_the_payment()
    {
        var (farmer, _) = await api.SignInAsync(SeededApiFixture.FarmerPhone, "farmer");

        var linked = await farmer.PutAsJsonAsync("/api/money/wallet", new { network = "mtn" });
        Assert.Equal(HttpStatusCode.OK, linked.StatusCode);
        var wallet = await linked.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("mtn", wallet.GetProperty("network").GetString());
        Assert.Equal(SeededApiFixture.FarmerPhone, wallet.GetProperty("phoneE164").GetString());

        var paid = await farmer.PostAsJsonAsync("/api/money/payments", new { purpose = "inputs", description = "Tolon Agro Inputs", amount = 545.50 });
        Assert.Equal(HttpStatusCode.OK, paid.StatusCode);
        var payment = await paid.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("waiting", payment.GetProperty("status").GetString());
        var reference = payment.GetProperty("reference").GetString();

        var status = await farmer.GetFromJsonAsync<JsonElement>($"/api/money/payments/{reference}", SeededApiFixture.Json);
        Assert.Equal(545.5m, status.GetProperty("amount").GetDecimal());

        var overview = await farmer.GetFromJsonAsync<JsonElement>("/api/money", SeededApiFixture.Json);
        Assert.True(overview.GetProperty("sample").GetBoolean());
        Assert.Contains(overview.GetProperty("payments").EnumerateArray(), p => p.GetProperty("reference").GetString() == reference);
    }

    [Fact]
    public async Task An_officer_cannot_use_a_farmers_money()
    {
        var (officer, _) = await api.SignInAsync(SeededApiFixture.OfficerPhone, "officer");

        Assert.Equal(HttpStatusCode.Forbidden, (await officer.GetAsync("/api/money")).StatusCode);
    }
}
