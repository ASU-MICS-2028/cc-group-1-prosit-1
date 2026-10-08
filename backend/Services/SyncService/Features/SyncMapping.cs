using AgroConnect.Data.Entities;
using AgroConnect.SharedLibrary.ValueObjects;
using AgroConnect.SyncService.Models;

namespace AgroConnect.SyncService.Features;

/// <summary>Copies a checked record from the phone onto the stored one. Who owns it and when it was first made never change.</summary>
public static class SyncMapping
{
    public static Farmer NewFarmer(SyncFarmer source, Guid officerId, DateTimeOffset now)
    {
        var farmer = new Farmer
        {
            Id = source.Id,
            RegisteredById = officerId,
            FullName = string.Empty,
            // When the server first received it; the time it was registered on the phone is ConsentAt.
            CreatedAt = now,
        };
        Apply(farmer, source, now);
        return farmer;
    }

    public static void Apply(Farmer target, SyncFarmer source, DateTimeOffset now)
    {
        target.ConsentGiven = source.ConsentGiven;
        target.ConsentAt = NotAfter(source.ConsentAt, now);
        target.Language = source.Language;
        target.FullName = SyncRules.Clean(source.FullName)!;
        // Stored in one form ("+233..."), so sign-in finds the farmer however the number was typed.
        target.PhoneE164 = source.HasNoPhone ? null : PhoneNumber.Parse(source.PhoneE164).E164;
        target.HasNoPhone = source.HasNoPhone;
        target.Gender = source.Gender;
        target.AgeBand = source.AgeBand;
        target.Community = SyncRules.Clean(source.Community);
        target.RegionDistrict = SyncRules.Clean(source.RegionDistrict);
        target.Crops = Distinct(source.Crops);
        target.FarmSize = source.FarmSize is { } size ? Math.Round(size, 2) : null;
        target.FarmSizeUnit = source.FarmSizeUnit;
        target.Soil = source.Soil;
        target.PlantingSeasons = Distinct(source.PlantingSeasons);
        target.Latitude = source.Latitude;
        target.Longitude = source.Longitude;
        target.LocationAccuracyMetres = source.Latitude is null ? null : source.LocationAccuracyMetres;
        target.PhotoId = source.PhotoId;
        target.PhoneType = source.PhoneType;
        target.DataPurchase = source.DataPurchase;
        target.ReachChannels = Distinct(source.ReachChannels);
        target.IncomeSources = Distinct(source.IncomeSources);
        target.HasBankAccount = source.HasBankAccount;
        target.MobileMoney = source.MobileMoney;
        target.LastAgentVisit = source.LastAgentVisit;
        target.HelpNeeded = Distinct(source.HelpNeeded);
        target.ClientUpdatedAt = NotAfter(source.ClientUpdatedAt, now);
        target.ServerUpdatedAt = now;
    }

    public static Visit NewVisit(SyncVisit source, Guid officerId, DateTimeOffset now)
    {
        var visit = new Visit
        {
            Id = source.Id,
            OfficerId = officerId,
            CreatedAt = now,
        };
        Apply(visit, source, now);
        return visit;
    }

    public static void Apply(Visit target, SyncVisit source, DateTimeOffset now)
    {
        target.FarmerId = source.FarmerId;
        target.Status = source.Status;
        target.ScheduledFor = source.ScheduledFor;
        target.CompletedAt = source.CompletedAt is { } completed ? NotAfter(completed, now) : null;
        target.Topics = Distinct(source.Topics);
        target.Observations = Distinct(source.Observations);
        target.Notes = SyncRules.Clean(source.Notes);
        target.PhotoIds = Distinct(source.PhotoIds);
        target.ClientUpdatedAt = NotAfter(source.ClientUpdatedAt, now);
        target.ServerUpdatedAt = now;
    }

    /// <summary>
    /// A phone time in UTC, and never later than now. Cheap phones often have the wrong date; a time in the
    /// future would make every later edit look older and be ignored.
    /// </summary>
    public static DateTimeOffset NotAfter(DateTimeOffset phoneTime, DateTimeOffset now) =>
        (phoneTime > now ? now : phoneTime).ToUniversalTime();

    private static List<T> Distinct<T>(IReadOnlyList<T>? values) => values is null ? [] : [.. values.Distinct()];
}
