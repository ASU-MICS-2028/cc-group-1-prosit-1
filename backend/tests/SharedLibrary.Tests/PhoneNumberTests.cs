using AgroConnect.SharedLibrary.ValueObjects;

namespace AgroConnect.SharedLibrary.Tests;

[UnitTest]
public class PhoneNumberTests
{
    [Theory]
    [InlineData("0240000000", "+233240000000")]
    [InlineData("024 000 0000", "+233240000000")]
    [InlineData("024-000-0000", "+233240000000")]
    [InlineData("+233 24 000 0000", "+233240000000")]
    [InlineData("+233240000000", "+233240000000")]
    [InlineData("233240000000", "+233240000000")]
    [InlineData("00233240000000", "+233240000000")]
    [InlineData("0551234567", "+233551234567")]
    [InlineData("0302123456", "+233302123456")]
    public void Parses_the_ways_people_write_a_ghana_number(string input, string expected)
    {
        Assert.True(PhoneNumber.TryParse(input, out var number));
        Assert.Equal(expected, number.E164);
        Assert.Equal(expected, number.ToString());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("024000000")]
    [InlineData("02400000000")]
    [InlineData("0140000000")]
    [InlineData("+2340240000000")]
    [InlineData("+254712345678")]
    [InlineData("abcdefghij")]
    [InlineData("24 000 0000")]
    public void Rejects_anything_that_is_not_a_ghana_number(string? input)
    {
        Assert.False(PhoneNumber.TryParse(input, out _));
    }

    [Fact]
    public void Parse_throws_on_invalid_input()
    {
        Assert.Throws<FormatException>(() => PhoneNumber.Parse("not a number"));
    }

    [Fact]
    public void The_same_number_written_differently_is_equal()
    {
        Assert.Equal(PhoneNumber.Parse("0240000000"), PhoneNumber.Parse("+233 24 000 0000"));
    }
}
