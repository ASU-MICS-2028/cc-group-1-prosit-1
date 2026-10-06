using AgroConnect.PlatformService.Models;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Features;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;

namespace AgroConnect.PlatformService.Features;

public sealed class GetSupportedLanguages : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/languages", Handle)
            .WithName("GetSupportedLanguages")
            .WithTags("Platform");
    }

    public static Ok<IReadOnlyList<LanguageDto>> Handle()
    {
        IReadOnlyList<LanguageDto> languages = [.. Enum.GetValues<Language>().Select(language => new LanguageDto(language.ToCode(), language.ToString()))];
        return TypedResults.Ok(languages);
    }
}
