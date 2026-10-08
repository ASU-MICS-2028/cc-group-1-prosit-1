using AgroConnect.FarmerService.Models;
using AgroConnect.FarmerService.Providers.Interfaces;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using Microsoft.Extensions.Logging;

namespace AgroConnect.FarmerService.Providers.Samples;

// Sample providers: realistic, labelled data (DataSource.Sample) so the whole farmer app can be built and
// tested before the live sources are connected (ADR 0031). Every answer is the same for the same day, so
// demos and tests repeat; it changes from day to day like real data. Replace one class at a time.

/// <summary>A small repeatable random source: the same seed (day plus key) gives the same numbers.</summary>
internal static class SampleRandom
{
    public static Random For(DateTimeOffset now, string key) =>
        new(HashCode.Combine(DateOnly.FromDateTime(now.UtcDateTime).DayNumber, StableHash(key)));

    private static int StableHash(string text)
    {
        unchecked
        {
            var hash = 17;
            foreach (var c in text)
            {
                hash = (hash * 31) + c;
            }

            return hash;
        }
    }
}

public sealed class SampleMarketPriceProvider(IClock clock) : IMarketPriceProvider
{
    /// <summary>Typical Northern Region prices in GH₵ per kg (2026 levels).</summary>
    private static readonly Dictionary<Crop, decimal> BasePrices = new()
    {
        [Crop.Maize] = 6.50m,
        [Crop.Sorghum] = 7.20m,
        [Crop.Rice] = 12.00m,
        [Crop.Groundnut] = 14.50m,
        [Crop.Yam] = 5.80m,
        [Crop.Cassava] = 3.20m,
    };

    private static readonly string[] Markets = ["Tamale", "Savelugu", "Kumbungu", "Yendi"];

    public Task<PricesResponse> GetPricesAsync(string? regionDistrict, IReadOnlyList<Crop> farmerCrops, CancellationToken cancellationToken)
    {
        var now = clock.UtcNow;
        // The farmer's own crops first, then the rest.
        var crops = farmerCrops.Concat(BasePrices.Keys.Except(farmerCrops)).ToList();
        var prices = crops.Select(crop =>
        {
            var random = SampleRandom.For(now, crop.ToString());
            var basePrice = BasePrices[crop];
            var markets = Markets
                .Select(market => new MarketPrice(market, Round(basePrice * (decimal)(0.94 + (random.NextDouble() * 0.12)))))
                .ToList();
            // A gentle 30-day walk, scaled so it flows into today's price at the first market.
            var walk = new List<double>();
            var level = 1.0;
            for (var day = 0; day < 30; day++)
            {
                level *= 0.99 + (random.NextDouble() * 0.022);
                walk.Add(level);
            }

            var scale = (double)markets[0].PricePerKg / walk[^1];
            var history = walk.Select(w => Round((decimal)(w * scale))).ToList();
            history[^1] = markets[0].PricePerKg;
            var weekAgo = history[^8];
            var change = weekAgo == 0 ? 0 : Math.Round((markets[0].PricePerKg - weekAgo) / weekAgo * 100, 0);
            return new CropPrice(crop, markets, change, history);
        }).ToList();

        return Task.FromResult(new PricesResponse(DataSource.Sample, StartOfDay(now).AddHours(6), "GHS", Markets, prices));
    }

    private static decimal Round(decimal value) => Math.Round(value, 2);

    private static DateTimeOffset StartOfDay(DateTimeOffset now) => new(now.UtcDateTime.Date, TimeSpan.Zero);
}

public sealed class SampleWeatherProvider(IClock clock) : IWeatherProvider
{
    public Task<WeatherResponse> GetForecastAsync(string place, double? latitude, double? longitude, CancellationToken cancellationToken)
    {
        var now = clock.UtcNow;
        var random = SampleRandom.For(now, place);
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var days = Enumerable.Range(0, 8).Select(offset =>
        {
            var rain = random.Next(0, 10) * 10;
            var condition = rain switch
            {
                >= 80 => random.Next(4) == 0 ? WeatherCondition.Storm : WeatherCondition.Rain,
                >= 50 => WeatherCondition.Rain,
                >= 30 => WeatherCondition.Cloudy,
                >= 10 => WeatherCondition.PartlyCloudy,
                _ => WeatherCondition.Sunny,
            };
            var max = 30 + random.Next(0, 6) - (rain / 25);
            return new WeatherDay(today.AddDays(offset), condition, max, max - 8 - random.Next(0, 3), rain);
        }).ToList();

        return Task.FromResult(new WeatherResponse(
            DataSource.Sample,
            new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero).AddHours(6),
            place,
            days[0],
            days.Skip(1).ToList(),
            AdviceFor(days)));
    }

    /// <summary>The farm rule of thumb for the next two days.</summary>
    public static WeatherAdvice AdviceFor(IReadOnlyList<WeatherDay> days)
    {
        var nextTwo = days.Take(3).ToList();
        if (nextTwo.Any(d => d.Condition == WeatherCondition.Storm))
        {
            return WeatherAdvice.StormProtectHarvest;
        }

        if (nextTwo.Any(d => d.RainChancePercent >= 60))
        {
            return WeatherAdvice.RainSoonDontSpray;
        }

        return days.Take(7).All(d => d.RainChancePercent < 20) ? WeatherAdvice.DrySpellWater : WeatherAdvice.GoodToSpray;
    }
}

/// <summary>A few rules of thumb an extension officer would use first. Not a diagnosis: it always suggests showing the officer when unsure.</summary>
public sealed class SampleCropAdviser : ICropAdviser
{
    public Task<CropCheckResponse> CheckAsync(CropCheckRequest request, CancellationToken cancellationToken)
    {
        var seen = request.Symptoms.ToHashSet();
        (CropProblem problem, bool urgent, CropAdvice[] advice) result =
            seen.Contains(CropSymptom.HolesInLeaves) && (seen.Contains(CropSymptom.InsectsSeen) || request.Crop is Crop.Maize or Crop.Sorghum)
                ? (CropProblem.FallArmyworm, true, [CropAdvice.CheckUnderLeaves, CropAdvice.PickAndCrush, CropAdvice.AskOfficerSpray])
            : seen.Contains(CropSymptom.Rotting)
                ? (CropProblem.RootRot, true, [CropAdvice.RemoveSickLeaves, CropAdvice.ImproveDrainage, CropAdvice.ShowOfficer])
            : seen.Contains(CropSymptom.SpotsOnLeaves)
                ? (CropProblem.LeafSpot, false, [CropAdvice.RemoveSickLeaves, CropAdvice.ShowOfficer])
            : seen.Contains(CropSymptom.Wilting)
                ? (CropProblem.DroughtStress, false, [CropAdvice.WaterEarly, CropAdvice.MulchSoil])
            : seen.Contains(CropSymptom.YellowLeaves) || seen.Contains(CropSymptom.Stunted)
                ? (CropProblem.NutrientShortage, false, [CropAdvice.AddFertiliser, CropAdvice.ShowOfficer])
            : (CropProblem.Unclear, false, [CropAdvice.ShowOfficer]);

        return Task.FromResult(new CropCheckResponse(DataSource.Sample, result.problem, result.urgent, result.advice));
    }
}

/// <summary>Typical Northern Ghana yields per acre in 100 kg bags (low, high) and the usual harvest month.</summary>
public sealed class SampleHarvestForecaster : IHarvestForecaster
{
    private static readonly Dictionary<Crop, (decimal Low, decimal High, int Month)> Yields = new()
    {
        [Crop.Maize] = (6, 10, 9),
        [Crop.Sorghum] = (4, 7, 10),
        [Crop.Rice] = (8, 12, 11),
        [Crop.Groundnut] = (5, 8, 9),
        [Crop.Yam] = (25, 40, 12),
        [Crop.Cassava] = (30, 50, 2),
    };

    private const decimal AcresPerHectare = 2.471m;

    public Task<HarvestForecastResponse> ForecastAsync(IReadOnlyList<Crop> crops, decimal? farmSize, AreaUnit unit, CancellationToken cancellationToken)
    {
        var acres = (farmSize ?? 0) * (unit == AreaUnit.Hectares ? AcresPerHectare : 1);
        // The farm is shared between its crops.
        var perCrop = crops.Count == 0 ? 0 : acres / crops.Count;
        var forecasts = crops
            .Select(crop =>
            {
                var (low, high, month) = Yields[crop];
                return new CropForecast(crop, (int)Math.Round(perCrop * low), (int)Math.Round(perCrop * high), month);
            })
            .ToList();
        return Task.FromResult(new HarvestForecastResponse(DataSource.Sample, forecasts));
    }
}

public sealed class SampleLessonCatalogue : ILessonCatalogue
{
    private static readonly Lesson[] Lessons =
    [
        new("dry-grain-storage", LessonTopic.Storage, 3),
        new("fall-armyworm-signs", LessonTopic.Pests, 2),
        new("maize-spacing", LessonTopic.Planting, 2),
        new("compost-at-home", LessonTopic.Soil, 4),
        new("selling-together", LessonTopic.Selling, 3),
        new("mobile-money-safety", LessonTopic.Money, 2),
    ];

    public Task<LessonsResponse> ListAsync(CancellationToken cancellationToken) =>
        Task.FromResult(new LessonsResponse(DataSource.Sample, Lessons));
}

/// <summary>Records the request in the log (ids only, never the text: it may hold personal details).</summary>
public sealed class LogOnlyChangeRequestInbox(IClock clock, ILogger<LogOnlyChangeRequestInbox> logger) : IChangeRequestInbox
{
    public Task<ChangeRequestResponse> SubmitAsync(Guid farmerId, Guid officerId, ChangeRequest request, CancellationToken cancellationToken)
    {
        var reference = $"CR-{clock.UtcNow:yyMMdd}-{farmerId.ToString("N")[..4].ToUpperInvariant()}";
        logger.LogInformation(
            "Change request {Reference} for farmer {FarmerId}: {Area}, for officer {OfficerId}",
            reference,
            farmerId,
            request.Area,
            officerId);
        return Task.FromResult(new ChangeRequestResponse(DataSource.Sample, reference));
    }
}
