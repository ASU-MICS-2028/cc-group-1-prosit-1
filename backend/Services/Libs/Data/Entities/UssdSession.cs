namespace AgroConnect.Data.Entities;

/// <summary>
/// Where one USSD session is in the menu (ADR 0038). The USSD gateway only sends the last key pressed, and
/// the next key can reach another server, so the place in the menu is kept here, not in memory.
/// </summary>
public sealed class UssdSession
{
    /// <summary>The gateway's session id, the same for every step of one dial.</summary>
    public required string SessionId { get; set; }

    /// <summary>The caller, "+233...".</summary>
    public required string PhoneE164 { get; set; }

    /// <summary>The farmer this phone belongs to; null when the number is not registered.</summary>
    public Guid? FarmerId { get; set; }

    /// <summary>The menu screen on show: "main", "prices", "ask".</summary>
    public required string Screen { get; set; }

    /// <summary>What the screen listed, e.g. the crops in the order shown ("maize,rice").</summary>
    public string? Data { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
