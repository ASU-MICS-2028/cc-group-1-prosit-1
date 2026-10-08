using System.Text;
using System.Threading.RateLimiting;
using AgroConnect.AuthService.Features;
using AgroConnect.AuthService.Providers.Implementations;
using AgroConnect.AuthService.Providers.Interfaces;
using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.SharedLibrary.Helpers;
using AgroConnect.SharedLibrary.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace AgroConnect.AuthService;

public static class AuthServiceExtension
{
    /// <summary>Per-address limit on the sign-in endpoints, on top of the per-phone limits in the handlers.</summary>
    public const string RateLimitPolicy = "auth";

    public static IServiceCollection AddAuthService(this IServiceCollection services, IConfiguration configuration)
    {
        var authOptions = services.AddOptions<AuthOptions>()
            .Bind(configuration.GetSection(AuthOptions.Section))
            .Validate(o => Encoding.UTF8.GetByteCount(o.SigningKey) >= 32, "Auth:SigningKey must be at least 32 bytes (set Auth__SigningKey).")
            .Validate(o => o.TokenLifetime > TimeSpan.Zero, "Auth:TokenLifetime must be longer than zero, e.g. 7.00:00:00.");
        if (!BuildTime.IsOpenApiExport)
        {
            authOptions.ValidateOnStart();
        }

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<AuthOptions>>((jwt, auth) =>
            {
                var settings = auth.Value;
                jwt.MapInboundClaims = false;
                jwt.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = settings.Issuer,
                    ValidAudience = settings.Audience,
                    IssuerSigningKey = JwtTokenIssuer.SigningKey(settings),
                    ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
                    NameClaimType = AuthClaims.UserId,
                    RoleClaimType = AuthClaims.Role,
                    ClockSkew = TimeSpan.FromMinutes(2),
                };
            });

        services.AddAuthorizationBuilder()
            .AddPolicy(AuthPolicies.Officer, policy => policy.RequireRole(AuthPolicies.Officer))
            .AddPolicy(AuthPolicies.Farmer, policy => policy.RequireRole(AuthPolicies.Farmer))
            .AddPolicy(AuthPolicies.Admin, policy => policy.RequireRole(AuthPolicies.Admin));

        services.AddRateLimiter(limiter =>
        {
            limiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            limiter.AddPolicy(RateLimitPolicy, context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = context.RequestServices.GetRequiredService<IOptions<AuthOptions>>().Value.RateLimitPerWindow,
                    Window = TimeSpan.FromMinutes(5),
                    QueueLimit = 0,
                }));
        });

        services.AddSingleton<ILoginCodeGenerator, LoginCodeGenerator>();
        services.AddSingleton<ITokenIssuer, JwtTokenIssuer>();

        return services
            .AddMessages(typeof(AuthServiceExtension).Assembly)
            .AddFeature<RequestCode>()
            .AddFeature<VerifyCode>()
            .AddFeature<GetMe>();
    }
}
