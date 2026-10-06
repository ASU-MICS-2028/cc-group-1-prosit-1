namespace AgroConnect.Data.Entities;

/// <summary>A farm or visit photo. The bytes live in photo storage; this row says what it is and whose it is.</summary>
public sealed class Photo
{
    public Guid Id { get; set; }

    public Guid FarmerId { get; set; }

    public Guid UploadedById { get; set; }

    public required string ContentType { get; set; }

    public long SizeBytes { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
