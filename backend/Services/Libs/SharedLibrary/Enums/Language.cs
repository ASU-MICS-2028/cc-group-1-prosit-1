using System.Text.Json.Serialization;

namespace AgroConnect.SharedLibrary.Enums;

/// <summary>Languages the platform supports (Week 1). Adding a language is adding a value and its content files.</summary>
public enum Language
{
    [JsonStringEnumMemberName("en")] English = 0,
    [JsonStringEnumMemberName("tw")] Twi = 1,
    [JsonStringEnumMemberName("ee")] Ewe = 2,
    [JsonStringEnumMemberName("dag")] Dagbani = 3,
}
