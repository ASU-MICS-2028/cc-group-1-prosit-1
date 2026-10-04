using Microsoft.AspNetCore.Routing;

namespace AgroConnect.SharedLibrary.Features;

/// <summary>
/// One use case, one class. A feature maps its own route and its handler takes what it needs
/// (providers, the session, the clock) as parameters, so a unit test can call the handler directly.
/// Register it in the service's AddXService() with AddFeature.
/// </summary>
public interface IFeature
{
    void MapEndpoint(IEndpointRouteBuilder app);
}
