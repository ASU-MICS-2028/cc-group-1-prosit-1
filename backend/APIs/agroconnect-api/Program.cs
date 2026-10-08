using System.Text.Json.Serialization;
using AgroConnect.AdminService;
using AgroConnect.Api.OpenApi;
using AgroConnect.AuthService;
using AgroConnect.CooperativeService;
using AgroConnect.Data;
using AgroConnect.FarmerService;
using AgroConnect.HelpService;
using AgroConnect.MoneyService;
using AgroConnect.PlatformService;
using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.SharedLibrary.Sms;
using AgroConnect.SpeechService;
using AgroConnect.SyncService;
using AgroConnect.UssdService;
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
// The API contract (OpenAPI), with the sign-in token described so tools know which calls need it.
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
    options.AddOperationTransformer<BearerRequirementTransformer>();
});
builder.Services.AddResponseCompression();

// Enums travel as their snake_case names ("officer", "maize"), the same strings the app uses.
// Numbers must be JSON numbers (not "45" as text), which also keeps the contract's number types exact.
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    options.SerializerOptions.NumberHandling = JsonNumberHandling.Strict;
});

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
    .AddSms(builder.Configuration)
    .AddData(builder.Configuration)
    .AddPlatformService()
    .AddAuthService(builder.Configuration)
    .AddFarmerService()
    .AddSyncService()
    .AddAdminService()
    .AddCooperativeService()
    .AddMoneyService(builder.Configuration)
    .AddHelpService()
    .AddSpeechService(builder.Configuration)
    .AddUssdService(builder.Configuration);

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

// Development only: the contract at /openapi/v1.json and Swagger UI at /swagger to try every endpoint.
// Never on the servers, where the API should not describe itself to the internet.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "AgroConnect API");
        options.RoutePrefix = "swagger";
        options.DocumentTitle = "AgroConnect API";
        options.EnablePersistAuthorization();
    });
}

app.Run();

// Lets the integration tests start the whole API in memory.
public partial class Program;
