using System.Text.Json.Serialization;
using AgroConnect.SharedLibrary.ValueObjects;

namespace AgroConnect.SharedLibrary.Providers.Interfaces;

/// <summary>What happened to a text message.</summary>
public enum SmsOutcome
{
    /// <summary>The SMS provider accepted it for delivery.</summary>
    [JsonStringEnumMemberName("sent")] Sent,

    /// <summary>Not texted on purpose: no provider key, or the number is not on the allowed list (laptops, staging).</summary>
    [JsonStringEnumMemberName("logged")] Logged,

    /// <summary>The provider refused it (no credit, unapproved sender ID, provider down).</summary>
    [JsonStringEnumMemberName("failed")] Failed,
}

/// <param name="Detail">The provider's message when it failed, for the log and the admin test.</param>
public sealed record SmsResult(SmsOutcome Outcome, string? Detail = null);

/// <summary>Sends a text message: Arkesel when a key is set (ADR 0037), otherwise only the log.</summary>
public interface ISmsSender
{
    Task<SmsResult> SendAsync(PhoneNumber to, string message, CancellationToken cancellationToken);
}
