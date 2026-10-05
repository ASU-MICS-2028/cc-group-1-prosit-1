namespace AgroConnect.AuthService;

/// <summary>Settings under "Auth". The signing key is a secret: set it with Auth__SigningKey, never in a committed file.</summary>
public sealed class AuthOptions
{
    public const string Section = "Auth";

    /// <summary>HMAC key for tokens and code hashes; at least 32 bytes.</summary>
    public string SigningKey { get; set; } = string.Empty;

    public string Issuer { get; set; } = "agroconnect";

    public string Audience { get; set; } = "agroconnect-app";

    /// <summary>A week: long enough for officers to work offline between trips to signal, short enough to limit a lost phone (ADR 0022).</summary>
    public int TokenLifetimeDays { get; set; } = 7;

    public int CodeLifetimeMinutes { get; set; } = 10;

    /// <summary>Matches "Resend code in 0:45" on the Enter Code screen.</summary>
    public int ResendCooldownSeconds { get; set; } = 45;

    public int MaxAttempts { get; set; } = 5;

    public int MaxCodesPerHour { get; set; } = 5;

    /// <summary>Sign-in requests allowed per network address every 5 minutes (a whole office can share one address).</summary>
    public int RateLimitPerWindow { get; set; } = 30;

    /// <summary>
    /// Demo and test only: every code is this value and no SMS is needed. Leave empty in production,
    /// where codes go out by SMS.
    /// </summary>
    public string? FixedCode { get; set; }
}
