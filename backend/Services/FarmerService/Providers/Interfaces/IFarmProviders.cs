using AgroConnect.FarmerService.Models;
using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.FarmerService.Providers.Interfaces;

// One interface per outside source. Each has a sample implementation today (Providers/Samples); a
// live one replaces it in FarmerServiceExtension without touching the features or the app (ADR 0031).

/// <summary>Crop prices per kg in the markets near the farmer (live later: MoFA SRID or Esoko).</summary>
public interface IMarketPriceProvider
{
    Task<PricesResponse> GetPricesAsync(string? regionDistrict, IReadOnlyList<Crop> farmerCrops, CancellationToken cancellationToken);
}

/// <summary>Today and the next days' weather for the farm (live later: Ghana Meteorological Agency or Open-Meteo).</summary>
public interface IWeatherProvider
{
    Task<WeatherResponse> GetForecastAsync(string place, double? latitude, double? longitude, CancellationToken cancellationToken);
}

/// <summary>A likely problem and advice from what the farmer sees (live later: an agronomy service or a photo model).</summary>
public interface ICropAdviser
{
    Task<CropCheckResponse> CheckAsync(CropCheckRequest request, CancellationToken cancellationToken);
}

/// <summary>An expected harvest from the farm's crops and size (live later: a yield model with weather).</summary>
public interface IHarvestForecaster
{
    Task<HarvestForecastResponse> ForecastAsync(IReadOnlyList<Crop> crops, decimal? farmSize, AreaUnit unit, CancellationToken cancellationToken);
}

/// <summary>The farmer's cooperative (live later: the cooperatives register).</summary>
public interface ICooperativeDirectory
{
    Task<CooperativeResponse> FindForAsync(string? community, string? regionDistrict, CancellationToken cancellationToken);
}

/// <summary>The short audio lessons available (live later: a lessons catalogue with recordings per language).</summary>
public interface ILessonCatalogue
{
    Task<LessonsResponse> ListAsync(CancellationToken cancellationToken);
}

/// <summary>Where a farmer's "please change my details" goes (live later: the officer's task list and an SMS).</summary>
public interface IChangeRequestInbox
{
    Task<ChangeRequestResponse> SubmitAsync(Guid farmerId, Guid officerId, ChangeRequest request, CancellationToken cancellationToken);
}
