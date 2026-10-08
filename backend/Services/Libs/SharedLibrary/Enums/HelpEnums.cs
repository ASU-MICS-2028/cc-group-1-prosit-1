using System.Text.Json.Serialization;

namespace AgroConnect.SharedLibrary.Enums;

// Help requests (ADR 0035). Numbers are stored in the database: add new values at the end, never renumber.

/// <summary>What a farmer needs help with (Figma P4 · 03 Get help).</summary>
public enum HelpCategory
{
    [JsonStringEnumMemberName("my_details")] MyDetails = 0,
    [JsonStringEnumMemberName("money")] Money = 1,
    [JsonStringEnumMemberName("crops")] Crops = 2,
    [JsonStringEnumMemberName("other")] Other = 3,
}

/// <summary>Where a help request stands.</summary>
public enum HelpStatus
{
    /// <summary>Sent; waiting for the farmer's officer.</summary>
    [JsonStringEnumMemberName("waiting")] Waiting = 0,

    /// <summary>The officer answered; the farmer can say whether it helped.</summary>
    [JsonStringEnumMemberName("answered")] Answered = 1,

    /// <summary>The farmer said the answer helped.</summary>
    [JsonStringEnumMemberName("solved")] Solved = 2,

    /// <summary>The farmer still needs help after the answer: back with the officer.</summary>
    [JsonStringEnumMemberName("still_needs_help")] StillNeedsHelp = 3,
}
