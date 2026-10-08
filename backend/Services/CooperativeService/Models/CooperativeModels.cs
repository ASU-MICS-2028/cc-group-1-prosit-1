using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.CooperativeService.Models;

// What the cooperative screens show (ADR 0040). Money in GH₵ here; stored in pesewas.

public sealed record CooperativeMemberInfo(Guid FarmerId, string FullName, bool IsLeader);

/// <summary>Paid savings only: the group's total and the signed-in farmer's share (0 for officers and admins).</summary>
public sealed record SavingsInfo(decimal Group, decimal Mine);

public sealed record GroupOrderInfo(
    Guid Id, string Product, string Dealer, decimal UnitPrice, decimal AlonePrice, int TargetBags, int OrderedBags,
    DateOnly ClosesOn, GroupOrderStatus Status, int MyBags);

public sealed record GroupSaleInfo(
    Guid Id, string Crop, string Buyer, decimal PricePerKg, decimal MarketPricePerKg, int TargetKg, int PledgedKg,
    GroupSaleStatus Status, int MyBags, int KgPerBag, int Pledgers);

public sealed record MeetingInfo(
    Guid Id, DateTimeOffset StartsAt, string Place, string Topic, string Bring, bool? Coming, int ComingCount);

public sealed record CooperativeDetails(
    Guid Id,
    string Name,
    string Community,
    string District,
    string LeaderName,
    string? LeaderPhoneE164,
    IReadOnlyList<CooperativeMemberInfo> Members,
    SavingsInfo Savings,
    GroupOrderInfo? OpenOrder,
    GroupSaleInfo? OpenSale,
    MeetingInfo? NextMeeting);

public sealed record AddSavingsRequest(decimal Amount);

public sealed record UpdateBagsRequest(int Bags);

public sealed record RsvpRequest(bool Coming);

/// <summary>A new cooperative in the officer's own region and district, led by one of their farmers.</summary>
public sealed record CreateCooperativeRequest(string Name, string Community, Guid LeaderFarmerId);

public sealed record AddMemberRequest(Guid FarmerId);

public sealed record CreateOrderRequest(
    string Product, string Dealer, decimal UnitPrice, decimal AlonePrice, int TargetBags, DateOnly ClosesOn);

public sealed record CreateSaleRequest(string Crop, string Buyer, decimal PricePerKg, decimal MarketPricePerKg, int TargetKg);

public sealed record CreateMeetingRequest(DateTimeOffset StartsAt, string Place, string Topic, string? Bring);

/// <summary>One group order as the admin sees it, open or past.</summary>
public sealed record AdminOrder(
    Guid Id, string Product, string Dealer, decimal UnitPrice, decimal AlonePrice, int TargetBags, int OrderedBags,
    int Members, DateOnly ClosesOn, GroupOrderStatus Status);

/// <summary>A cooperative on the admin's page (Figma P4 · D5).</summary>
public sealed record AdminCooperative(CooperativeDetails Cooperative, IReadOnlyList<AdminOrder> Orders, int SoldKg);

public sealed record RemindResult(int Members);
