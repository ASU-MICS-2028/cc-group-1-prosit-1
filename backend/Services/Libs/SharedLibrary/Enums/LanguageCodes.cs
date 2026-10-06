namespace AgroConnect.SharedLibrary.Enums;

/// <summary>The short codes used on the wire (the X-Language header, message files) and by the frontend i18n.</summary>
public static class LanguageCodes
{
    public static string ToCode(this Language language) => language switch
    {
        Language.English => "en",
        Language.Twi => "tw",
        Language.Ewe => "ee",
        Language.Dagbani => "dag",
        _ => throw new ArgumentOutOfRangeException(nameof(language), language, "Unknown language."),
    };

    public static bool TryParseCode(string? code, out Language language)
    {
        foreach (var candidate in Enum.GetValues<Language>())
        {
            if (string.Equals(candidate.ToCode(), code?.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                language = candidate;
                return true;
            }
        }

        language = default;
        return false;
    }
}
