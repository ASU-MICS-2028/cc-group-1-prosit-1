namespace AgroConnect.PlatformService.Models;

public sealed record HealthResponse(string Status, string Service, IReadOnlyDictionary<string, string> Checks);
