using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.Data.Entities;

/// <summary>Someone who can sign in. Officers are added by MoFA (seeded for now); a farmer account is created on first sign-in.</summary>
public sealed class AppUser
{
    public Guid Id { get; set; }

    public UserRole Role { get; set; }

    /// <summary>E.164, for example "+233240000001". Unique per role.</summary>
    public required string PhoneE164 { get; set; }

    public required string FullName { get; set; }

    public string? Region { get; set; }

    public string? District { get; set; }

    /// <summary>For a farmer account: the farmer record it belongs to.</summary>
    public Guid? FarmerId { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
