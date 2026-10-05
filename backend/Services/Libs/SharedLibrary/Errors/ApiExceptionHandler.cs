using AgroConnect.SharedLibrary.Messages;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace AgroConnect.SharedLibrary.Errors;

/// <summary>Turns an <see cref="ApiException"/> into RFC 9457 problem details, with the detail in the caller's language.</summary>
public sealed class ApiExceptionHandler(IMessageProvider messages, IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not ApiException apiException)
        {
            return false; // not ours: the default handler answers with a plain 500 problem
        }

        // The handler lives for the whole app, the session only for this request, so ask the request for it.
        var session = httpContext.RequestServices.GetRequiredService<ISessionProvider>();
        httpContext.Response.StatusCode = apiException.StatusCode;

        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Status = apiException.StatusCode,
                Title = apiException.MessageKey,
                Detail = messages.Get(apiException.MessageKey, session.Language, apiException.MessageArgs),
            },
        });
    }
}
