using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.Data.Entities;

public sealed class Cooperative
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Community { get; set; }
    public required string Region { get; set; }
    public required string District { get; set; }
    public Guid LeaderFarmerId { get; set; }
    public Guid CreatedById { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class CooperativeMember
{
    public Guid CooperativeId { get; set; }
    public Guid FarmerId { get; set; }
    public DateTimeOffset JoinedAt { get; set; }
}

public sealed class SavingsContribution
{
    public Guid Id { get; set; }
    public Guid CooperativeId { get; set; }
    public Guid FarmerId { get; set; }
    public long AmountPesewas { get; set; }
    public Guid PaymentId { get; set; }
    public SavingsContributionStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class GroupOrder
{
    public Guid Id { get; set; }
    public Guid CooperativeId { get; set; }
    public required string Product { get; set; }
    public required string Dealer { get; set; }
    public long UnitPricePesewas { get; set; }
    public long AlonePricePesewas { get; set; }
    public int TargetBags { get; set; }
    public DateOnly ClosesOn { get; set; }
    public GroupOrderStatus Status { get; set; }
}

public sealed class GroupOrderLine
{
    public Guid OrderId { get; set; }
    public Guid FarmerId { get; set; }
    public int Bags { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class GroupSale
{
    public Guid Id { get; set; }
    public Guid CooperativeId { get; set; }
    public required string Crop { get; set; }
    public required string Buyer { get; set; }
    public long PricePerKgPesewas { get; set; }
    public long MarketPricePerKgPesewas { get; set; }
    public int TargetKg { get; set; }
    public GroupSaleStatus Status { get; set; }
}

public sealed class SalePledge
{
    public Guid SaleId { get; set; }
    public Guid FarmerId { get; set; }
    public int Bags { get; set; }
    public int KgPerBag { get; set; }
}

public sealed class Meeting
{
    public Guid Id { get; set; }
    public Guid CooperativeId { get; set; }
    public DateTimeOffset StartsAt { get; set; }
    public required string Place { get; set; }
    public required string Topic { get; set; }
    public required string Bring { get; set; }
}

public sealed class MeetingRsvp
{
    public Guid MeetingId { get; set; }
    public Guid FarmerId { get; set; }
    public bool Coming { get; set; }
}
