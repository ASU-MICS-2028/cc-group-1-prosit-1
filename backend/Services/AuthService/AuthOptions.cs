namespace AgroConnect.AuthService;

/// <summary>Settings under "Auth". The signing key is a secret: set it with Auth__SigningKey, never in a committed file.</summary>
public sealed class AuthOptions
{
    public const string Section = "Auth";

    /// <summary>HMAC key for tokens and code hashes; at least 32 bytes.</summary>
    public string SigningKey { get; set; } = string.Empty;

    public string Issuer { get; set; } = "agroconnect";

    public string Audience { get; set; } = "agroconnect-app";

    /// <summary>
    /// How long a sign-in lasts. A week on the servers: long enough for officers to work offline between
    /// trips to signal, short enough to limit a lost phone (ADR 0022). Written as days.hours:minutes:seconds,
    /// e.g. "7.00:00:00"; laptops use "01:00:00" so the sign-in screens are seen often while testing.
    /// </summary>
    public TimeSpan TokenLifetime { get; set; } = TimeSpan.FromDays(7);

    public int CodeLifetimeMinutes { get; set; } = 10;

    /// <summary>Matches "Resend code in 0:45" on the Enter Code screen.</summary>
    public int ResendCooldownSeconds { get; set; } = 45;

    public int MaxAttempts { get; set; } = 5;

    public int MaxCodesPerHour { get; set; } = 20;

    /// <summary>Sign-in requests allowed per network address every 5 minutes (a whole office can share one address).</summary>
    public int RateLimitPerWindow { get; set; } = 30;

    /// <summary>
    /// A backup code for when SMS is not working (laptops and the staging demo only, ADR 0039). Codes are always
    /// random and texted; this code is also accepted, for any number that has an account, after "Send code".
    /// Production must leave it empty and refuses to start otherwise.
    /// </summary>
    public string? BackupCode { get; set; }

    /// <summary>The old name of <see cref="BackupCode"/>, still read so a server's Auth__FixedCode keeps working.</summary>
    [Obsolete("Use BackupCode (Auth__BackupCode).")]
    public string? FixedCode
    {
        get => null;
        set => BackupCode ??= value;
    }

    /// <summary>True when a backup code is set and this is it.</summary>
    public bool IsBackupCode(string code) =>
        BackupCode is { Length: 6 } backup && backup.All(char.IsAsciiDigit) && code == backup;
}
