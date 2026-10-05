using System.Security.Claims;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Providers.Implementations;
using Microsoft.AspNetCore.Http;
using NSubstitute;

namespace AgroConnect.SharedLibrary.Tests;

[UnitTest]
public class SessionProviderTests
{
    private static SessionProvider With(HttpContext? context)
    {
        var accessor = Substitute.For<IHttpContextAccessor>();
        accessor.HttpContext.Returns(context);
        return new SessionProvider(accessor);
    }

    [Theory]
    [InlineData("tw", Language.Twi)]
    [InlineData("EE", Language.Ewe)]
    [InlineData("dag", Language.Dagbani)]
    public void Language_comes_from_the_x_language_header(string header, Language expected)
    {
        var context = new DefaultHttpContext();
        context.Request.Headers[SessionProvider.LanguageHeader] = header;

        Assert.Equal(expected, With(context).Language);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("fr")]
    public void Language_is_english_when_the_header_is_missing_or_unknown(string? header)
    {
        var context = new DefaultHttpContext();
        if (header is not null)
        {
            context.Request.Headers[SessionProvider.LanguageHeader] = header;
        }

        Assert.Equal(Language.English, With(context).Language);
    }

    [Fact]
    public void Language_is_english_outside_a_request()
    {
        Assert.Equal(Language.English, With(null).Language);
    }

    [Fact]
    public void User_id_comes_from_the_name_identifier_claim()
    {
        var id = Guid.NewGuid();
        var context = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, id.ToString())], "test")),
        };

        Assert.Equal(id, With(context).UserId);
    }

    [Fact]
    public void User_id_is_null_for_anonymous_calls()
    {
        Assert.Null(With(new DefaultHttpContext()).UserId);
        Assert.Null(With(null).UserId);
    }
}
