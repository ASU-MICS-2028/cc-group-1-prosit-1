namespace AgroConnect.AdminService.Models;

/// <summary>The admin's area: a region, or one district of it.</summary>
public sealed record AdminArea(string? Region, string? District);

/// <summary>One extension officer in the admin's area.</summary>
public sealed record OfficerSummary(
    Guid Id,
    string FullName,
    string PhoneE164,
    string? District,
    int Farmers,
    int FarmersThisMonth,
    int VisitsThisMonth,
    DateTimeOffset? LastSyncAt);

/// <summary>The admin overview: totals for the area and each officer.</summary>
public sealed record AdminOverview(
    AdminArea Area,
    int Officers,
    int Farmers,
    int FarmersThisMonth,
    int VisitsThisMonth,
    IReadOnlyList<OfficerSummary> OfficerList);
