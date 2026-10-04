using System.Diagnostics.CodeAnalysis;

namespace AgroConnect.SharedLibrary.ValueObjects;

/// <summary>
/// A Ghana phone number held in E.164 form (+233 followed by 9 digits).
/// Accepts the ways people actually write it: "024 000 0000", "0240000000",
/// "+233 24 000 0000", "233240000000", "00233240000000".
/// </summary>
public readonly record struct PhoneNumber
{
    private const string CountryCode = "233";
    private const int NationalNumberLength = 9;

    private PhoneNumber(string e164)
    {
        E164 = e164;
    }

    /// <summary>The number as "+233XXXXXXXXX".</summary>
    public string E164 { get; }

    public override string ToString() => E164;

    public static PhoneNumber Parse(string? input)
    {
        if (TryParse(input, out var number))
        {
            return number;
        }

        throw new FormatException($"'{input}' is not a valid Ghana phone number.");
    }

    public static bool TryParse(string? input, [NotNullWhen(true)] out PhoneNumber result)
    {
        result = default;
        if (string.IsNullOrWhiteSpace(input))
        {
            return false;
        }

        var cleaned = new string(input.Where(c => !char.IsWhiteSpace(c) && c is not ('-' or '.' or '(' or ')')).ToArray());

        string national;
        if (cleaned.StartsWith("+" + CountryCode, StringComparison.Ordinal))
        {
            national = cleaned[(1 + CountryCode.Length)..];
        }
        else if (cleaned.StartsWith("00" + CountryCode, StringComparison.Ordinal))
        {
            national = cleaned[(2 + CountryCode.Length)..];
        }
        else if (cleaned.StartsWith(CountryCode, StringComparison.Ordinal) && cleaned.Length == CountryCode.Length + NationalNumberLength)
        {
            national = cleaned[CountryCode.Length..];
        }
        else if (cleaned.StartsWith('0'))
        {
            national = cleaned[1..];
        }
        else
        {
            return false;
        }

        // Ghana national numbers are 9 digits and start with 2, 3 or 5 (mobile 02x/05x, fixed 03x).
        if (national.Length != NationalNumberLength || !national.All(char.IsAsciiDigit) || national[0] is not ('2' or '3' or '5'))
        {
            return false;
        }

        result = new PhoneNumber("+" + CountryCode + national);
        return true;
    }
}
