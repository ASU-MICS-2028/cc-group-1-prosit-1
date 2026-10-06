using AgroConnect.AuthService.Models;
using AgroConnect.Data.Persistence;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace AgroConnect.AuthService.Features;

/// <summary>The signed-in person. The app calls it on open to check the saved token still works.</summary>
public sealed class GetMe : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/me", Handle)
            .WithName("GetMe")
            .WithTags("Auth")
            .RequireAuthorization()
            .ProducesProblem(StatusCodes.Status401Unauthorized);
    }

    public static async Task<Ok<MeResponse>> Handle(AppDbContext db, ISessionProvider session, CancellationToken cancellationToken)
    {
        var userId = session.RequireUserId();
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status401Unauthorized, "UNAUTHORIZED");
        return TypedResults.Ok(MeResponse.From(user));
    }
}
