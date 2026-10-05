using System.Text.Json.Serialization;
using AgroConnect.AuthService;
using AgroConnect.Data;
using AgroConnect.PlatformService;
using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Serilog;
using Serilog.Formatting.Compact;

var builder = WebApplication.CreateBuilder(args);

// Structured logs on stdout (Docker collects them). Never log personal data: log ids only.
builder.Host.UseSerilog((context, _, logger) =>
{
    logger.ReadFrom.Configuration(context.Configuration).Enrich.FromLogContext();
    if (context.HostingEnvironment.IsDevelopment())
    {
        logger.WriteTo.Console();
    }
    else
    {
        logger.WriteTo.Console(new RenderedCompactJsonFormatter());
    }
});

builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddResponseCompression();

// Enums travel as their snake_case names ("officer", "maize"), the same strings the app uses.
builder.Services.ConfigureHttpJsonOptions(options => options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// The API only runs behind nginx on a private Docker network, so trust its X-Forwarded-For for the client address
// (the sign-in rate limit is per address).
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

// Each service adds itself here. A new service is one line.
builder.Services
    .AddSharedLibrary()
    .AddData(builder.Configuration)
    .AddPlatformService()
    .AddAuthService(builder.Configuration);

var app = builder.Build();

app.UseForwardedHeaders();
app.UseSerilogRequestLogging();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseResponseCompression();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapFeatures();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.Run();

// Lets the integration tests start the whole API in memory.
public partial class Program;
