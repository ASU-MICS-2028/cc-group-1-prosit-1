namespace AgroConnect.SharedLibrary.Helpers;

/// <summary>
/// Hides personal data wherever it must be shown to someone who does not need all of it (support
/// screens, audit lines). Logs should carry ids only; if a value must appear, mask it first.
/// </summary>
public static class DataMaskingHelper
{
    private const string Hidden = "***";

    /// <summary>Keeps the last four digits: "+233240001234" becomes "***1234".</summary>
    public static string MaskPhone(string? phone)
    {
        var digits = new string((phone ?? string.Empty).Where(char.IsAsciiDigit).ToArray());
        return digits.Length < 4 ? Hidden : Hidden + digits[^4..];
    }

    /// <summary>Keeps the first letter: "Akosua" becomes "A***".</summary>
    public static string MaskName(string? name)
        => string.IsNullOrWhiteSpace(name) ? Hidden : name.Trim()[0] + Hidden;

    /// <summary>Keeps the first eight characters of an id.</summary>
    public static string MaskId(Guid id) => id.ToString()[..8] + Hidden;
}
