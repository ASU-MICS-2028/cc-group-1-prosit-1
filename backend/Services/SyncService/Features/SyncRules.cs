using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.ValueObjects;
using AgroConnect.SyncService.Models;

namespace AgroConnect.SyncService.Features;

/// <summary>
/// The rules a record must meet before it is stored: the same rules the registration form checks on the
/// phone, plus the database limits. The server checks again because a phone can run an old app version.
/// Each rule answers with a message key, shown to the officer as "To fix".
/// </summary>
public static class SyncRules
{
    public const int MaxNameLength = 100;
    public const int MaxPlaceLength = 100;
    public const decimal MaxFarmSize = 100_000m;
    public const int MaxNotesLength = 2000;

    /// <summary>The first rule the farmer breaks, or null when it can be stored.</summary>
    public static string? CheckFarmer(SyncFarmer farmer)
    {
        if (farmer.ClientUpdatedAt == default)
        {
            return "RECORD_UNREADABLE";
        }

        if (!farmer.ConsentGiven)
        {
            return "CONSENT_REQUIRED";
        }

        if (Clean(farmer.FullName) is not { Length: >= 2 and <= MaxNameLength })
        {
            return "NAME_INVALID";
        }

        if (!farmer.HasNoPhone && !PhoneNumber.TryParse(farmer.PhoneE164, out _))
        {
            return "PHONE_INVALID";
        }

        if (Clean(farmer.Community)?.Length > MaxPlaceLength || Clean(farmer.RegionDistrict)?.Length > MaxPlaceLength)
        {
            return "PLACE_TOO_LONG";
        }

        if (farmer.Crops is not { Count: > 0 })
        {
            return "CROPS_REQUIRED";
        }

        if (farmer.FarmSize is not (> 0 and <= MaxFarmSize))
        {
            return "FARM_SIZE_INVALID";
        }

        return LocationIsValid(farmer) ? null : "LOCATION_INVALID";
    }

    /// <summary>The first rule the visit breaks, or null when it can be stored.</summary>
    public static string? CheckVisit(SyncVisit visit)
    {
        if (visit.ClientUpdatedAt == default || visit.ScheduledFor == default)
        {
            return "RECORD_UNREADABLE";
        }

        if (visit.Status == VisitStatus.Done && visit.CompletedAt is null)
        {
            return "VISIT_END_REQUIRED";
        }

        return Clean(visit.Notes)?.Length > MaxNotesLength ? "NOTES_TOO_LONG" : null;
    }

    /// <summary>Trimmed text, or null when there is nothing left.</summary>
    public static string? Clean(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();

    /// <summary>No location, or a whole one on the globe (the phone's GPS never sends half).</summary>
    private static bool LocationIsValid(SyncFarmer farmer) =>
        (farmer.Latitude, farmer.Longitude) switch
        {
            (null, null) => true,
            (double latitude, double longitude) =>
                latitude is >= -90 and <= 90 && longitude is >= -180 and <= 180 && farmer.LocationAccuracyMetres is null or >= 0,
            _ => false,
        };
}
