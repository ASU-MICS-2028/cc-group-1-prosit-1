using AgroConnect.AdminService.Features;
using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Features;
using Microsoft.Extensions.DependencyInjection;

namespace AgroConnect.AdminService;

public static class AdminServiceExtension
{
    /// <summary>The MoFA admin's pages (ADR 0024): the overview of their area, adding people, and a test SMS.</summary>
    public static IServiceCollection AddAdminService(this IServiceCollection services) =>
        services
            .AddMessages(typeof(AdminServiceExtension).Assembly)
            .AddFeature<GetOverview>()
            .AddFeature<AddPerson>()
            .AddFeature<SendTestSms>();
}
