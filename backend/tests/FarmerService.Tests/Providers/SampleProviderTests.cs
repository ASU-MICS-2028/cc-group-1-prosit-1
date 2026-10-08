using AgroConnect.FarmerService.Models;
using AgroConnect.FarmerService.Providers.Samples;
using AgroConnect.SharedLibrary.Enums;
using Microsoft.Extensions.Logging.Abstractions;

namespace AgroConnect.FarmerService.Tests.Providers;

[UnitTest]
public sealed class SampleProviderTests
{
    private readonly TestClock _clock = new();

    [Fact]
    public async Task Prices_cover_every_crop_in_four_markets_with_30_days_and_repeat_within_a_day()
    {
        var provider = new SampleMarketPriceProvider(_clock);

        var first = await provider.GetPricesAsync("Northern", [Crop.Groundnut], CancellationToken.None);
        var again = await provider.GetPricesAsync("Northern", [Crop.Groundnut], CancellationToken.None);

        Assert.Equal(DataSource.Sample, first.Source);
        Assert.Equal("GHS", first.Currency);
        Assert.Equal(6, first.Prices.Count);
        Assert.Equal(Crop.Groundnut, first.Prices[0].Crop);
        Assert.All(first.Prices, p =>
        {
            Assert.Equal(4, p.Markets.Count);
            Assert.Equal(30, p.Last30Days.Count);
            Assert.All(p.Markets, m => Assert.InRange(m.PricePerKg, 1m, 20m));
            Assert.Equal(p.Markets[0].PricePerKg, p.Last30Days[^1]);
        });
        Assert.Equal(first.Prices.Select(p => p.Markets[0].PricePerKg), again.Prices.Select(p => p.Markets[0].PricePerKg));

        _clock.Advance(TimeSpan.FromDays(1));
        var tomorrow = await provider.GetPricesAsync("Northern", [Crop.Groundnut], CancellationToken.None);
        Assert.NotEqual(first.Prices.Select(p => p.Markets[0].PricePerKg), tomorrow.Prices.Select(p => p.Markets[0].PricePerKg));
    }

    [Fact]
    public async Task Weather_has_today_and_seven_days_with_sensible_values()
    {
        var forecast = await new SampleWeatherProvider(_clock).GetForecastAsync("Tolon", null, null, CancellationToken.None);

        Assert.Equal("Tolon", forecast.Place);
        Assert.Equal(DateOnly.FromDateTime(_clock.UtcNow.UtcDateTime), forecast.Today.Date);
        Assert.Equal(7, forecast.NextDays.Count);
        Assert.All(forecast.NextDays.Prepend(forecast.Today), day =>
        {
            Assert.InRange(day.RainChancePercent, 0, 100);
            Assert.True(day.MinC < day.MaxC);
        });
    }

    private static WeatherDay Day(int rain, WeatherCondition condition = WeatherCondition.Sunny) =>
        new(new DateOnly(2026, 10, 1), condition, 32, 22, rain);

    [Fact]
    public void Weather_advice_follows_the_next_days()
    {
        Assert.Equal(WeatherAdvice.StormProtectHarvest, SampleWeatherProvider.AdviceFor([Day(0), Day(90, WeatherCondition.Storm), Day(0)]));
        Assert.Equal(WeatherAdvice.RainSoonDontSpray, SampleWeatherProvider.AdviceFor([Day(0), Day(70, WeatherCondition.Rain), Day(0)]));
        Assert.Equal(WeatherAdvice.DrySpellWater, SampleWeatherProvider.AdviceFor(Enumerable.Repeat(Day(10), 8).ToList()));
        Assert.Equal(WeatherAdvice.GoodToSpray, SampleWeatherProvider.AdviceFor([Day(10), Day(20), Day(0), Day(40), Day(0), Day(0), Day(0)]));
    }

    [Theory]
    [InlineData(Crop.Maize, new[] { CropSymptom.HolesInLeaves }, CropProblem.FallArmyworm, true)]
    [InlineData(Crop.Groundnut, new[] { CropSymptom.HolesInLeaves, CropSymptom.InsectsSeen }, CropProblem.FallArmyworm, true)]
    [InlineData(Crop.Cassava, new[] { CropSymptom.Rotting }, CropProblem.RootRot, true)]
    [InlineData(Crop.Groundnut, new[] { CropSymptom.SpotsOnLeaves }, CropProblem.LeafSpot, false)]
    [InlineData(Crop.Maize, new[] { CropSymptom.Wilting }, CropProblem.DroughtStress, false)]
    [InlineData(Crop.Rice, new[] { CropSymptom.YellowLeaves }, CropProblem.NutrientShortage, false)]
    [InlineData(Crop.Yam, new[] { CropSymptom.HolesInLeaves }, CropProblem.Unclear, false)]
    public async Task Crop_advice_follows_simple_rules(Crop crop, CropSymptom[] symptoms, CropProblem expected, bool urgent)
    {
        var result = await new SampleCropAdviser().CheckAsync(new CropCheckRequest(crop, symptoms), CancellationToken.None);

        Assert.Equal(expected, result.LikelyProblem);
        Assert.Equal(urgent, result.Urgent);
        Assert.NotEmpty(result.Advice);
    }

    [Fact]
    public async Task Harvest_shares_the_farm_between_crops_and_converts_hectares()
    {
        var forecaster = new SampleHarvestForecaster();

        var acres = await forecaster.ForecastAsync([Crop.Maize, Crop.Groundnut], 4m, AreaUnit.Acres, CancellationToken.None);
        var hectares = await forecaster.ForecastAsync([Crop.Maize], 1m, AreaUnit.Hectares, CancellationToken.None);
        var nothing = await forecaster.ForecastAsync([], null, AreaUnit.Acres, CancellationToken.None);

        Assert.Equal(new CropForecast(Crop.Maize, 12, 20, 9), acres.Crops[0]);
        Assert.Equal(new CropForecast(Crop.Groundnut, 10, 16, 9), acres.Crops[1]);
        Assert.Equal(15, hectares.Crops[0].LowBags);
        Assert.Empty(nothing.Crops);
    }

    [Fact]
    public async Task Lessons_and_change_requests_answer_as_samples()
    {
        var lessons = await new SampleLessonCatalogue().ListAsync(CancellationToken.None);
        var change = await new LogOnlyChangeRequestInbox(_clock, NullLogger<LogOnlyChangeRequestInbox>.Instance)
            .SubmitAsync(Guid.Parse("0192f0a0-0000-7000-8000-000000000001"), Guid.CreateVersion7(), new ChangeRequest(ChangeArea.Farm, "2 acres now"), CancellationToken.None);

        Assert.Equal(6, lessons.Lessons.Count);
        Assert.Equal(lessons.Lessons.Count, lessons.Lessons.Select(l => l.Id).Distinct().Count());
        Assert.Equal("CR-261001-0192", change.Reference);
        Assert.Equal(DataSource.Sample, change.Source);
    }
}
