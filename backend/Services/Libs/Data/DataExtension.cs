using AgroConnect.Data.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AgroConnect.Data;

public static class DataExtension
{
    public static IServiceCollection AddData(this IServiceCollection services, IConfiguration configuration)
    {
        // An empty fallback keeps start-up (and the build-time OpenAPI export) working without a
        // database; the /health check then reports the database as unavailable.
        var connectionString = configuration.GetConnectionString("Default") ?? string.Empty;

        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
        services.AddHealthChecks().AddDbContextCheck<AppDbContext>("database");

        return services;
    }
}
