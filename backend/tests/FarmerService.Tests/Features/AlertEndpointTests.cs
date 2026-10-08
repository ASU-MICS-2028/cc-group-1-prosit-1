using AgroConnect.FarmerService.Features;
using AgroConnect.FarmerService.Models;
using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.FarmerService.Tests.Features;

[IntegrationTest]
[Collection(DatabaseCollection.Name)]
public sealed class AlertEndpointTests(PostgresFixture database) : FarmerTestBase(database)
{
    [Fact]
    public async Task Starts_with_the_farmers_own_crops_and_keeps_what_they_choose()
    {
        var officer = await AddOfficerAsync();
        var farmer = await AddFarmerAsync(officer, change: f => f.Crops = [Crop.Maize, Crop.Groundnut]);
        SignInAs(farmer);

        var first = (await GetAlerts.Handle(Db, Session, CancellationToken.None)).Value!;
        Assert.Equal([Crop.Maize, Crop.Groundnut], first.PriceCrops);
        Assert.True(first.HeavyRain);
        Assert.True(first.DrySpell);

        var saved = (await SaveAlerts.Handle(
            new AlertSettingsRequest([Crop.Sorghum, Crop.Sorghum], false, true), Db, Session, Clock, CancellationToken.None)).Value!;
        Assert.Equal([Crop.Sorghum], saved.PriceCrops);

        await using var db = Database.CreateContext();
        var again = (await GetAlerts.Handle(db, Session, CancellationToken.None)).Value!;
        Assert.Equal([Crop.Sorghum], again.PriceCrops);
        Assert.False(again.HeavyRain);
        Assert.True(again.DrySpell);

        var changed = (await SaveAlerts.Handle(
            new AlertSettingsRequest([], true, false), db, Session, Clock, CancellationToken.None)).Value!;
        Assert.Empty(changed.PriceCrops);
    }
}
