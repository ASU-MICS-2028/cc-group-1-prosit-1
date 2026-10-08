using System.Text.Json.Serialization;

namespace AgroConnect.SharedLibrary.Enums;

// Mobile money (ADR 0034). Numbers are stored in the database: add new values at the end, never renumber.

/// <summary>The mobile money network a wallet is on.</summary>
public enum MobileNetwork
{
    [JsonStringEnumMemberName("mtn")] Mtn = 0,
    [JsonStringEnumMemberName("telecel")] Telecel = 1,
    [JsonStringEnumMemberName("airteltigo")] AirtelTigo = 2,
}

/// <summary>What a payment is for.</summary>
public enum PaymentPurpose
{
    [JsonStringEnumMemberName("inputs")] Inputs = 0,
    [JsonStringEnumMemberName("insurance")] Insurance = 1,
    [JsonStringEnumMemberName("loan_repayment")] LoanRepayment = 2,
    [JsonStringEnumMemberName("savings")] Savings = 3,
}

/// <summary>Where a payment stands.</summary>
public enum PaymentStatus
{
    /// <summary>Sent to the network; the farmer approves it on their phone.</summary>
    [JsonStringEnumMemberName("waiting")] Waiting = 0,

    /// <summary>The network sent a one-time code (some Telecel wallets); the farmer types it in the app.</summary>
    [JsonStringEnumMemberName("needs_code")] NeedsCode = 1,

    [JsonStringEnumMemberName("paid")] Paid = 2,

    /// <summary>Declined, timed out, or not enough money.</summary>
    [JsonStringEnumMemberName("failed")] Failed = 3,
}
