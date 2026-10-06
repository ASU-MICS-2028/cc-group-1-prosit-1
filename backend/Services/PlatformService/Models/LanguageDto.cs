namespace AgroConnect.PlatformService.Models;

/// <summary>A language the platform supports. Code is what the X-Language header and the frontend use.</summary>
public sealed record LanguageDto(string Code, string Name);
