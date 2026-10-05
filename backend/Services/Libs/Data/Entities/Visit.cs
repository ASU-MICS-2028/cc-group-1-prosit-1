using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.Data.Entities;

/// <summary>An extension visit to a farmer: planned, then done (with what was discussed and seen).</summary>
public sealed class Visit
{
    public Guid Id { get; set; }

    public Guid FarmerId { get; set; }

    public Guid OfficerId { get; set; }

    public VisitStatus Status { get; set; }

    public DateOnly ScheduledFor { get; set; }

    public DateTimeOffset? CompletedAt { get; set; }

    public List<VisitTopic> Topics { get; set; } = [];

    public List<FarmObservation> Observations { get; set; } = [];

    public string? Notes { get; set; }

    public List<Guid> PhotoIds { get; set; } = [];

    public DateTimeOffset ClientUpdatedAt { get; set; }

    public DateTimeOffset ServerUpdatedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
