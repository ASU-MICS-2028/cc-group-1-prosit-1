using AgroConnect.CooperativeService.Features;
using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Features;
using Microsoft.Extensions.DependencyInjection;

namespace AgroConnect.CooperativeService;

public static class CooperativeServiceExtension
{
    /// <summary>Cooperatives: savings, group orders, selling together and meetings (ADR 0037).</summary>
    public static IServiceCollection AddCooperativeService(this IServiceCollection services) =>
        services
            .AddMessages(typeof(CooperativeServiceExtension).Assembly)
            .AddFeature<GetMyCooperative>()
            .AddFeature<AddSavings>()
            .AddFeature<UpdateOrder>()
            .AddFeature<UpdateSale>()
            .AddFeature<UpdateRsvp>()
            .AddFeature<GetOfficerCooperatives>()
            .AddFeature<CreateCooperative>()
            .AddFeature<AddCooperativeMember>()
            .AddFeature<CreateOrder>()
            .AddFeature<CreateSale>()
            .AddFeature<CreateMeeting>()
            .AddFeature<GetAdminCooperatives>()
            .AddFeature<RemindPledges>();
}
