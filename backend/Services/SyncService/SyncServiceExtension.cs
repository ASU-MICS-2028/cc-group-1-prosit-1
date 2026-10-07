using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.SyncService.Features;
using Microsoft.Extensions.DependencyInjection;

namespace AgroConnect.SyncService;

public static class SyncServiceExtension
{
    /// <summary>Offline sync: officers' phones send the farmers and visits they saved without network (ADR 0032).</summary>
    public static IServiceCollection AddSyncService(this IServiceCollection services) =>
        services
            .AddMessages(typeof(SyncServiceExtension).Assembly)
            .AddFeature<SyncRecords>();
}
