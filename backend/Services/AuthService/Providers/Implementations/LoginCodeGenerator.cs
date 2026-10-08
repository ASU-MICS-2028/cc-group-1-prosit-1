using System.Globalization;
using System.Security.Cryptography;
using AgroConnect.AuthService.Providers.Interfaces;

namespace AgroConnect.AuthService.Providers.Implementations;

/// <summary>Every code is random and texted; the backup code (AuthOptions.BackupCode) is checked separately.</summary>
public sealed class LoginCodeGenerator : ILoginCodeGenerator
{
    public string NewCode() => RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6", CultureInfo.InvariantCulture);
}
