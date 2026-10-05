using System.Security.Cryptography;
using System.Text;

namespace AgroConnect.AuthService.Providers.Implementations;

/// <summary>
/// Codes are stored as a keyed hash tied to the phone number, so a leaked table reveals no codes and a
/// hash cannot be replayed for another number.
/// </summary>
public static class LoginCodeHasher
{
    public static string Hash(string code, string phoneE164, string key)
    {
        var mac = HMACSHA256.HashData(Encoding.UTF8.GetBytes(key), Encoding.UTF8.GetBytes($"{phoneE164}:{code}"));
        return Convert.ToHexString(mac);
    }

    public static bool Matches(string code, string phoneE164, string key, string storedHash)
    {
        var expected = Encoding.ASCII.GetBytes(Hash(code, phoneE164, key));
        var actual = Encoding.ASCII.GetBytes(storedHash);
        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }
}
