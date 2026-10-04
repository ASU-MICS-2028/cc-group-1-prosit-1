using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.SharedLibrary.Tests;

[UnitTest]
public class LanguageCodesTests
{
    [Theory]
    [InlineData(Language.English, "en")]
    [InlineData(Language.Twi, "tw")]
    [InlineData(Language.Ewe, "ee")]
    [InlineData(Language.Dagbani, "dag")]
    public void Every_language_has_its_code_and_parses_back(Language language, string code)
    {
        Assert.Equal(code, language.ToCode());
        Assert.True(LanguageCodes.TryParseCode(code, out var parsed));
        Assert.Equal(language, parsed);
    }

    [Theory]
    [InlineData("TW")]
    [InlineData(" ee ")]
    public void Parsing_ignores_case_and_surrounding_spaces(string code)
    {
        Assert.True(LanguageCodes.TryParseCode(code, out _));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("fr")]
    public void Unknown_codes_do_not_parse(string? code)
    {
        Assert.False(LanguageCodes.TryParseCode(code, out _));
    }

    [Fact]
    public void An_undefined_language_value_is_rejected()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => ((Language)99).ToCode());
    }
}
