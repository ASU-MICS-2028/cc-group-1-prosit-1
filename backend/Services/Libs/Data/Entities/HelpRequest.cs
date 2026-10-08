using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.Data.Entities;

/// <summary>
/// A farmer's question (Get help, or "Ask my officer to confirm" after Check my crop). It goes to the officer
/// who registered the farmer; the MoFA admin steps in from the Help desk when it waits too long (ADR 0035).
/// </summary>
public sealed class HelpRequest
{
    public Guid Id { get; set; }

    public Guid FarmerId { get; set; }

    /// <summary>The officer who answers: the farmer's own officer, unless an admin reassigned it. Null when they left.</summary>
    public Guid? OfficerId { get; set; }

    public HelpCategory Category { get; set; }

    /// <summary>What the farmer typed (optional when they recorded a voice note).</summary>
    public string? Text { get; set; }

    /// <summary>From Check my crop: the crop and the likely problem the app found.</summary>
    public Crop? Crop { get; set; }

    public string? Problem { get; set; }

    public bool HasVoiceNote { get; set; }

    public int? VoiceSeconds { get; set; }

    public HelpStatus Status { get; set; }

    public string? Answer { get; set; }

    public Guid? AnsweredById { get; set; }

    public DateTimeOffset? AnsweredAt { get; set; }

    /// <summary>When an admin last reminded the officer.</summary>
    public DateTimeOffset? RemindedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}

/// <summary>The recording attached to a help request, kept apart so lists never load audio.</summary>
public sealed class HelpVoiceNote
{
    /// <summary>The help request's id (one note per request).</summary>
    public Guid HelpRequestId { get; set; }

    public required string ContentType { get; set; }

    public required byte[] Audio { get; set; }
}

/// <summary>Which SMS alerts a farmer wants (Figma P2 · 07). One row per farmer.</summary>
public sealed class AlertSetting
{
    public Guid FarmerId { get; set; }

    /// <summary>Crops whose price changes of more than 5% are sent by SMS.</summary>
    public List<Crop> PriceCrops { get; set; } = [];

    public bool HeavyRain { get; set; }

    public bool DrySpell { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}

/// <summary>A sentence read aloud in a Ghanaian language by the speech provider, kept so it is made once.</summary>
public sealed class SpeechClip
{
    public Guid Id { get; set; }

    /// <summary>"tw", "ee" or "dag".</summary>
    public required string Language { get; set; }

    /// <summary>SHA-256 of the English text, hex.</summary>
    public required string TextHash { get; set; }

    public required string Text { get; set; }

    /// <summary>The text in the language, as the provider translated it (for native speakers to review).</summary>
    public required string Translated { get; set; }

    public required string ContentType { get; set; }

    public required byte[] Audio { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
