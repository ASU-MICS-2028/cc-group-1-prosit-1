using AgroConnect.Data;
using AgroConnect.PlatformService;
using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Features;
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

// Each service adds itself here. A new service is one line.
builder.Services
    .AddSharedLibrary()
    .AddData(builder.Configuration)
    .AddPlatformService();

var app = builder.Build();

app.UseSerilogRequestLogging();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseResponseCompression();

app.MapFeatures();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.Run();

// Lets the integration tests start the whole API in memory.
public partial class Program;
