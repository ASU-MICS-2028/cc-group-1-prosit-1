using AgroConnect.AuthService.Providers.Implementations;
using AgroConnect.Data.Entities;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.ValueObjects;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using NSubstitute;

namespace AgroConnect.AuthService.Tests.Providers;

[UnitTest]
public sealed class AuthProviderTests
{
    private static readonly string Key = TestSettings.SigningKey;

    [Fact]
    public void Hash_matches_only_the_same_code_for_the_same_phone()
    {
        var hash = LoginCodeHasher.Hash("123456", "+233240000001", Key);

        Assert.True(LoginCodeHasher.Matches("123456", "+233240000001", Key, hash));
        Assert.False(LoginCodeHasher.Matches("123457", "+233240000001", Key, hash));
        Assert.False(LoginCodeHasher.Matches("123456", "+233240000002", Key, hash));
        Assert.False(LoginCodeHasher.Matches("123456", "+233240000001", Key + "x", hash));
    }

    [Fact]
    public void Generator_always_makes_random_six_digit_codes()
    {
        var generator = new LoginCodeGenerator();

        var codes = Enumerable.Range(0, 20).Select(_ => generator.NewCode()).ToList();

        Assert.All(codes, code => Assert.Matches("^[0-9]{6}$", code));
        Assert.True(codes.Distinct().Count() > 1);
    }

    [Fact]
    public async Task Token_carries_the_user_role_and_farmer_and_validates_with_the_key()
    {
        var clock = new TestClock();
        var settings = new AuthOptions { SigningKey = Key };
        var issuer = new JwtTokenIssuer(Options.Create(settings), clock);
        var user = new AppUser
        {
            Id = Guid.CreateVersion7(),
            Role = UserRole.Farmer,
            PhoneE164 = "+233240001234",
            FullName = "Ama Boateng",
            FarmerId = Guid.CreateVersion7(),
        };

        var token = issuer.Issue(user);

        Assert.Equal(clock.UtcNow.AddDays(7), token.ExpiresAt);
        var result = await new JsonWebTokenHandler().ValidateTokenAsync(token.Value, new TokenValidationParameters
        {
            ValidIssuer = "agroconnect",
            ValidAudience = "agroconnect-app",
            IssuerSigningKey = JwtTokenIssuer.SigningKey(settings),
            ValidateLifetime = false,
        });
        Assert.True(result.IsValid);
        Assert.Equal(user.Id.ToString(), result.Claims["sub"]);
        Assert.Equal("farmer", result.Claims["role"]);
        Assert.Equal(user.FarmerId.ToString(), result.Claims["farmer_id"]);
        Assert.Equal(clock.UtcNow.UtcDateTime, new JsonWebToken(token.Value).IssuedAt);
    }

    [Fact]
    public void Token_expires_after_the_configured_lifetime()
    {
        var clock = new TestClock();
        var settings = new AuthOptions { SigningKey = Key, TokenLifetime = TimeSpan.FromHours(1) };

        var token = new JwtTokenIssuer(Options.Create(settings), clock)
            .Issue(new AppUser { Role = UserRole.Officer, PhoneE164 = "+233240000001", FullName = "Officer" });

        Assert.Equal(clock.UtcNow.AddHours(1), token.ExpiresAt);
        Assert.Equal(clock.UtcNow.AddHours(1).UtcDateTime, new JsonWebToken(token.Value).ValidTo);
    }

    [Fact]
    public void Officer_token_has_no_farmer_claim()
    {
        var issuer = new JwtTokenIssuer(Options.Create(new AuthOptions { SigningKey = Key }), new TestClock());

        var token = issuer.Issue(new AppUser { Role = UserRole.Officer, PhoneE164 = "+233240000001", FullName = "Officer" });

        var jwt = new JsonWebToken(token.Value);
        Assert.Equal("officer", jwt.GetClaim("role").Value);
        Assert.False(jwt.TryGetClaim("farmer_id", out _));
    }
}
