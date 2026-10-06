using System.Globalization;
using System.Security.Cryptography;
using AgroConnect.AuthService.Providers.Interfaces;
using Microsoft.Extensions.Options;

namespace AgroConnect.AuthService.Providers.Implementations;

public sealed class LoginCodeGenerator(IOptions<AuthOptions> options) : ILoginCodeGenerator
{
    public string NewCode() =>
        options.Value.FixedCode is { Length: 6 } fixedCode && fixedCode.All(char.IsAsciiDigit)
            ? fixedCode
            : RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6", CultureInfo.InvariantCulture);
}
