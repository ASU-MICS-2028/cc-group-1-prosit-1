using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.MoneyService.Models;

/// <summary>The farmer's linked wallet (their own number; the app shows it partly hidden).</summary>
public sealed record WalletInfo(MobileNetwork Network, string PhoneE164, string NameOnWallet, bool CanReceive);

/// <summary>One payment, as the farmer sees it. Amount in GH₵.</summary>
public sealed record PaymentInfo(
    string Reference,
    PaymentPurpose Purpose,
    string Description,
    decimal Amount,
    MobileNetwork Network,
    PaymentStatus Status,
    string? Message,
    DateTimeOffset CreatedAt);

/// <summary>The Money home: is the provider live, the wallet (if linked) and the latest payments.</summary>
public sealed record MoneyOverview(bool Sample, WalletInfo? Wallet, IReadOnlyList<PaymentInfo> Payments);

public sealed record LinkWalletRequest(MobileNetwork Network);

public sealed record PayRequest(PaymentPurpose Purpose, string Description, decimal Amount);

public sealed record PaymentCodeRequest(string Code);
