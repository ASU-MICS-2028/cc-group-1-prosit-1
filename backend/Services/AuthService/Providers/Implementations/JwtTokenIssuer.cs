using System.Security.Claims;
using System.Text;
using AgroConnect.AuthService.Providers.Interfaces;
using AgroConnect.Data.Entities;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using AgroConnect.SharedLibrary.Security;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace AgroConnect.AuthService.Providers.Implementations;

public sealed class JwtTokenIssuer(IOptions<AuthOptions> options, IClock clock) : ITokenIssuer
{
    private static readonly JsonWebTokenHandler Handler = new();

    public IssuedToken Issue(AppUser user)
    {
        var settings = options.Value;
        var now = clock.UtcNow;
        var expires = now.Add(settings.TokenLifetime);

        var claims = new List<Claim>
        {
            new(AuthClaims.UserId, user.Id.ToString()),
            new(AuthClaims.Role, user.Role == UserRole.Officer ? AuthPolicies.Officer : AuthPolicies.Farmer),
        };
        if (user.FarmerId is { } farmerId)
        {
            claims.Add(new Claim(AuthClaims.FarmerId, farmerId.ToString()));
        }

        var token = Handler.CreateToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Issuer = settings.Issuer,
            Audience = settings.Audience,
            IssuedAt = now.UtcDateTime,
            NotBefore = now.UtcDateTime,
            Expires = expires.UtcDateTime,
            SigningCredentials = new SigningCredentials(SigningKey(settings), SecurityAlgorithms.HmacSha256),
        });

        return new IssuedToken(token, expires);
    }

    public static SymmetricSecurityKey SigningKey(AuthOptions settings) => new(Encoding.UTF8.GetBytes(settings.SigningKey));
}
