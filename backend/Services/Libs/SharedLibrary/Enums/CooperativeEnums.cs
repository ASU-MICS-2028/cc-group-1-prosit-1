using System.Text.Json.Serialization;

namespace AgroConnect.SharedLibrary.Enums;

/// <summary>Status of a savings contribution. It only counts after its mobile-money payment is paid.</summary>
public enum SavingsContributionStatus
{
    [JsonStringEnumMemberName("waiting")] Waiting = 0,
    [JsonStringEnumMemberName("paid")] Paid = 1,
    [JsonStringEnumMemberName("failed")] Failed = 2,
}

public enum GroupOrderStatus
{
    [JsonStringEnumMemberName("open")] Open = 0,
    [JsonStringEnumMemberName("closed")] Closed = 1,
    [JsonStringEnumMemberName("delivered")] Delivered = 2,
}

public enum GroupSaleStatus
{
    [JsonStringEnumMemberName("open")] Open = 0,
    [JsonStringEnumMemberName("closed")] Closed = 1,
    [JsonStringEnumMemberName("delivered")] Delivered = 2,
}
