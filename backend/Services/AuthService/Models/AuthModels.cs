using AgroConnect.Data.Entities;
using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.AuthService.Models;

/// <summary>Ask for a sign-in code. The phone can be typed the way people write it ("024 000 0000").</summary>
public sealed record RequestCodeRequest(string Phone, UserRole Role);

/// <summary>How long to wait before "Resend code" is allowed, and how long the code works.</summary>
public sealed record RequestCodeResponse(int ResendAfterSeconds, int ExpiresInSeconds);

public sealed record VerifyCodeRequest(string Phone, UserRole Role, string Code);

public sealed record AuthResponse(string Token, DateTimeOffset ExpiresAt, MeResponse User);

/// <summary>The signed-in person, shown on Home and Profile.</summary>
public sealed record MeResponse(
    Guid Id,
    UserRole Role,
    string FullName,
    string Phone,
    string? Region,
    string? District,
    Guid? FarmerId)
{
    public static MeResponse From(AppUser user) =>
        new(user.Id, user.Role, user.FullName, user.PhoneE164, user.Region, user.District, user.FarmerId);
}
