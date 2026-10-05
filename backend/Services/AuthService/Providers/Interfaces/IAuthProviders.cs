using AgroConnect.Data.Entities;
using AgroConnect.SharedLibrary.ValueObjects;

namespace AgroConnect.AuthService.Providers.Interfaces;

/// <summary>Makes the 6-digit sign-in codes.</summary>
public interface ILoginCodeGenerator
{
    string NewCode();
}

/// <summary>Sends a text message. Africa's Talking in production; the development version writes to the log.</summary>
public interface ISmsSender
{
    Task SendAsync(PhoneNumber to, string message, CancellationToken cancellationToken);
}

/// <summary>Issues the signed token the app sends as "Authorization: Bearer ...".</summary>
public interface ITokenIssuer
{
    IssuedToken Issue(AppUser user);
}

public sealed record IssuedToken(string Value, DateTimeOffset ExpiresAt);
