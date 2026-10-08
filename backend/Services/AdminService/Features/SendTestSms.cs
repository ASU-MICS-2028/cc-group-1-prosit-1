using AgroConnect.Data.Persistence;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using AgroConnect.SharedLibrary.Security;
using AgroConnect.SharedLibrary.ValueObjects;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;

namespace AgroConnect.AdminService.Features;

/// <param name="Phone">Who gets it; empty means the admin's own phone.</param>
public sealed record TestSmsRequest(string? Phone);

/// <summary>What happened: "sent" (Arkesel accepted it), "logged" (not texted on purpose), "failed" (with Arkesel's reason).</summary>
public sealed record TestSmsResponse(SmsOutcome Outcome, string? Detail);

/// <summary>POST /api/admin/sms/test: an admin checks that SMS works on this server (ADR 0037).</summary>
public sealed class SendTestSms : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/admin/sms/test", Handle)
            .WithName("SendTestSms")
            .WithTags("Admin")
            .RequireAuthorization(AuthPolicies.Admin)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden);

    public static async Task<Ok<TestSmsResponse>> Handle(
        TestSmsRequest request, AppDbContext db, ISessionProvider session, ISmsSender sms, CancellationToken cancellationToken)
    {
        var admin = await CurrentAdmin.LoadAsync(db, session, cancellationToken);
        var target = string.IsNullOrWhiteSpace(request.Phone) ? admin.PhoneE164 : request.Phone;
        if (!PhoneNumber.TryParse(target, out var phone))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "INVALID_PHONE");
        }

        var result = await sms.SendAsync(phone, "AgroConnect test message. If you can read this, SMS works.", cancellationToken);
        return TypedResults.Ok(new TestSmsResponse(result.Outcome, result.Detail));
    }
}
