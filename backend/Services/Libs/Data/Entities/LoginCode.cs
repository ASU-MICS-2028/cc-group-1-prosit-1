using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.Data.Entities;

/// <summary>A one-time sign-in code sent by SMS. Only a hash is stored, never the code.</summary>
public sealed class LoginCode
{
    public Guid Id { get; set; }

    public required string PhoneE164 { get; set; }

    public UserRole Role { get; set; }

    public required string CodeHash { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    public int Attempts { get; set; }

    public DateTimeOffset? UsedAt { get; set; }
}
