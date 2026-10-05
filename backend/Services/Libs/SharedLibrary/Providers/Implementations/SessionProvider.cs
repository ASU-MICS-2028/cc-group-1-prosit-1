using System.Security.Claims;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using Microsoft.AspNetCore.Http;

namespace AgroConnect.SharedLibrary.Providers.Implementations;

public sealed class SessionProvider(IHttpContextAccessor accessor) : ISessionProvider
{
    public const string LanguageHeader = "X-Language";

    public Language Language =>
        LanguageCodes.TryParseCode(accessor.HttpContext?.Request.Headers[LanguageHeader].ToString(), out var language)
            ? language
            : Language.English;

    public Guid? UserId =>
        Guid.TryParse(accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
}
