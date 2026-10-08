using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.Data.Entities;

/// <summary>A farmer's linked mobile money wallet (one per farmer). The PIN is never seen or stored: the network asks for it.</summary>
public sealed class Wallet
{
    public Guid Id { get; set; }

    public Guid FarmerId { get; set; }

    public MobileNetwork Network { get; set; }

    /// <summary>The wallet's number, "+233...". Today always the farmer's registered phone.</summary>
    public required string PhoneE164 { get; set; }

    /// <summary>Paystack's id for this wallet as a payout recipient ("RCP_..."), used to send the farmer money.</summary>
    public string? RecipientCode { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
