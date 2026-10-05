using AgroConnect.SharedLibrary.Helpers;

namespace AgroConnect.SharedLibrary.Tests;

[UnitTest]
public class DataMaskingHelperTests
{
    [Theory]
    [InlineData("+233240001234", "***1234")]
    [InlineData("024 000 1234", "***1234")]
    [InlineData("123", "***")]
    [InlineData("", "***")]
    [InlineData(null, "***")]
    public void Phone_keeps_only_the_last_four_digits(string? phone, string expected)
    {
        Assert.Equal(expected, DataMaskingHelper.MaskPhone(phone));
    }

    [Theory]
    [InlineData("Akosua", "A***")]
    [InlineData("  Kwame", "K***")]
    [InlineData("", "***")]
    [InlineData(null, "***")]
    public void Name_keeps_only_the_first_letter(string? name, string expected)
    {
        Assert.Equal(expected, DataMaskingHelper.MaskName(name));
    }

    [Fact]
    public void Id_keeps_only_the_first_eight_characters()
    {
        var id = Guid.Parse("0f8fad5b-d9cb-469f-a165-70867728950e");

        Assert.Equal("0f8fad5b***", DataMaskingHelper.MaskId(id));
    }
}
