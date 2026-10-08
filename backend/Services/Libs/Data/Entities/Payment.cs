using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.Data.Entities;

/// <summary>A mobile money payment by a farmer, through the payment provider (Paystack, ADR 0034).</summary>
public sealed class Payment
{
    public Guid Id { get; set; }

    public Guid FarmerId { get; set; }

    public PaymentPurpose Purpose { get; set; }

    /// <summary>What the farmer sees in their history, e.g. "Tolon Agro Inputs".</summary>
    public required string Description { get; set; }

    /// <summary>In pesewas (GH₵ 1 = 100), so money is never a rounded decimal.</summary>
    public long AmountPesewas { get; set; }

    public MobileNetwork Network { get; set; }

    public required string PhoneE164 { get; set; }

    /// <summary>Our reference, sent to the provider; unique, so a retried request never charges twice.</summary>
    public required string Reference { get; set; }

    public PaymentStatus Status { get; set; }

    /// <summary>The provider's last message (e.g. "Approve the payment on your phone"), for support.</summary>
    public string? ProviderMessage { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
