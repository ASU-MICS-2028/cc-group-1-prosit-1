using AgroConnect.HelpService.Features;
using AgroConnect.SharedLibrary;
using AgroConnect.SharedLibrary.Features;
using Microsoft.Extensions.DependencyInjection;

namespace AgroConnect.HelpService;

public static class HelpServiceExtension
{
    /// <summary>Farmers' questions, the officer's Requests and the admin's Help desk (ADR 0035).</summary>
    public static IServiceCollection AddHelpService(this IServiceCollection services) =>
        services
            .AddMessages(typeof(HelpServiceExtension).Assembly)
            .AddFeature<AskForHelp>()
            .AddFeature<GetMyHelpRequests>()
            .AddFeature<GiveHelpFeedback>()
            .AddFeature<GetHelpVoiceNote>()
            .AddFeature<GetOfficerRequests>()
            .AddFeature<AnswerRequestFeature>()
            .AddFeature<GetHelpDesk>()
            .AddFeature<ReassignHelpRequest>()
            .AddFeature<RemindOfficer>();
}
