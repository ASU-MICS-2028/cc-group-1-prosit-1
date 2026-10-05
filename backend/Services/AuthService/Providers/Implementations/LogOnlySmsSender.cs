using AgroConnect.AuthService.Providers.Interfaces;
using AgroConnect.SharedLibrary.Helpers;
using AgroConnect.SharedLibrary.ValueObjects;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AgroConnect.AuthService.Providers.Implementations;

/// <summary>
/// Until Africa's Talking is connected: on a developer machine the message (with the code) goes to the log
/// so sign-in can be tried; anywhere else nothing personal is logged, only that SMS is not set up.
/// </summary>
public sealed partial class LogOnlySmsSender(IHostEnvironment environment, ILogger<LogOnlySmsSender> logger) : ISmsSender
{
    public Task SendAsync(PhoneNumber to, string message, CancellationToken cancellationToken)
    {
        if (environment.IsDevelopment())
        {
            LogMessage(logger, DataMaskingHelper.MaskPhone(to.E164), message);
        }
        else
        {
            LogNotConfigured(logger);
        }

        return Task.CompletedTask;
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "SMS to {Phone}: {Message}")]
    private static partial void LogMessage(ILogger logger, string phone, string message);

    [LoggerMessage(Level = LogLevel.Warning, Message = "SMS sending is not configured; no message was sent")]
    private static partial void LogNotConfigured(ILogger logger);
}
