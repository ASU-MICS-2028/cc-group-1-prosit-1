using System.Security.Claims;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using AgroConnect.SharedLibrary.Security;
using Microsoft.AspNetCore.Http;

namespace AgroConnect.SharedLibrary.Providers.Implementations;

public sealed class SessionProvider(IHttpContextAccessor accessor) : ISessionProvider
{
    public const string LanguageHeader = "X-Language";

    public Language Language =>
        LanguageCodes.TryParseCode(accessor.HttpContext?.Request.Headers[LanguageHeader].ToString(), out var language)
            ? language
            : Language.English;

    public Guid? UserId => ReadGuid(AuthClaims.UserId) ?? ReadGuid(ClaimTypes.NameIdentifier);

    public Guid? FarmerId => ReadGuid(AuthClaims.FarmerId);

    public Guid RequireUserId() =>
        UserId ?? throw new ApiException(StatusCodes.Status401Unauthorized, "UNAUTHORIZED");

    private Guid? ReadGuid(string claim) =>
        Guid.TryParse(accessor.HttpContext?.User.FindFirstValue(claim), out var id) ? id : null;
}
