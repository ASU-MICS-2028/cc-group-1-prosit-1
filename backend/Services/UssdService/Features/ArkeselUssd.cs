using System.Text.Json.Serialization;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Features;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;

namespace AgroConnect.UssdService.Features;

/// <summary>Settings under "Ussd" (ADR 0038).</summary>
public sealed class UssdOptions
{
    /// <summary>
    /// The USSD app id Arkesel gives us ("userID" in every request). When set, requests with another id are
    /// refused, so only our USSD code reaches the menu. Empty: any request is answered (the sandbox emulator).
    /// </summary>
    public string? UserId { get; set; }
}

/// <summary>What Arkesel sends for every key the person presses (only the latest key, never the whole path).</summary>
public sealed record ArkeselUssdRequest(
    [property: JsonPropertyName("sessionID")] string SessionId,
    [property: JsonPropertyName("userID")] string? UserId,
    [property: JsonPropertyName("newSession")] bool NewSession,
    [property: JsonPropertyName("msisdn")] string Msisdn,
    [property: JsonPropertyName("userData")] string? UserData,
    [property: JsonPropertyName("network")] string? Network);

/// <summary>What Arkesel shows on the phone; continueSession false closes the menu.</summary>
public sealed record ArkeselUssdResponse(
    [property: JsonPropertyName("sessionID")] string SessionId,
    [property: JsonPropertyName("userID")] string? UserId,
    [property: JsonPropertyName("msisdn")] string Msisdn,
    [property: JsonPropertyName("message")] string Message,
    [property: JsonPropertyName("continueSession")] bool ContinueSession);

/// <summary>POST /api/ussd/arkesel: Arkesel's USSD callback. No sign-in: the caller is known by their number.</summary>
public sealed class ArkeselUssd : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/ussd/arkesel", Handle)
            .WithName("ArkeselUssd")
            .WithTags("USSD")
            .AllowAnonymous()
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status403Forbidden);

    public static async Task<Ok<ArkeselUssdResponse>> Handle(
        ArkeselUssdRequest request, UssdMenu menu, IOptions<UssdOptions> options, CancellationToken cancellationToken)
    {
        var appId = options.Value.UserId;
        if (!string.IsNullOrWhiteSpace(appId) && request.UserId != appId)
        {
            throw new ApiException(StatusCodes.Status403Forbidden, "USSD_WRONG_APP");
        }

        var reply = await menu.StepAsync(request.SessionId, request.Msisdn, request.NewSession, request.UserData, cancellationToken);
        return TypedResults.Ok(new ArkeselUssdResponse(request.SessionId, request.UserId, request.Msisdn, reply.Message, reply.Continue));
    }
}
