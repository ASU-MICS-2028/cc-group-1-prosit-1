using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SyncService.Features;
using AgroConnect.SyncService.Models;

namespace AgroConnect.SyncService.Tests.Features;

[UnitTest]
public sealed class SyncRulesTests
{
    private static readonly DateTimeOffset At = new(2026, 10, 1, 9, 0, 0, TimeSpan.Zero);

    private static readonly SyncFarmer Valid = new(
        Guid.CreateVersion7(), true, At, Language.English, "Ama Boateng", "+233241000001", false, null, null, "Tolon", null,
        [Crop.Maize], 2.5m, AreaUnit.Acres, null, null, 9.4, -0.9, 10, null, null, null, null, null, null, null, null, null, At);

    private static readonly SyncVisit ValidVisit = new(
        Guid.CreateVersion7(), Guid.CreateVersion7(), VisitStatus.Done, new DateOnly(2026, 10, 1), At, null, null, "Notes", null, At);

    public static TheoryData<string, SyncFarmer> BrokenFarmers => new()
    {
        { "RECORD_UNREADABLE", Valid with { ClientUpdatedAt = default } },
        { "CONSENT_REQUIRED", Valid with { ConsentGiven = false } },
        { "NAME_INVALID", Valid with { FullName = " A " } },
        { "NAME_INVALID", Valid with { FullName = null! } },
        { "NAME_INVALID", Valid with { FullName = new string('a', 101) } },
        { "PHONE_INVALID", Valid with { PhoneE164 = "+23324" } },
        { "PHONE_INVALID", Valid with { PhoneE164 = null } },
        { "PLACE_TOO_LONG", Valid with { Community = new string('a', 101) } },
        { "PLACE_TOO_LONG", Valid with { RegionDistrict = new string('a', 101) } },
        { "CROPS_REQUIRED", Valid with { Crops = [] } },
        { "CROPS_REQUIRED", Valid with { Crops = null! } },
        { "FARM_SIZE_INVALID", Valid with { FarmSize = 0 } },
        { "FARM_SIZE_INVALID", Valid with { FarmSize = null } },
        { "FARM_SIZE_INVALID", Valid with { FarmSize = 100_001 } },
        { "LOCATION_INVALID", Valid with { Longitude = null } },
        { "LOCATION_INVALID", Valid with { Latitude = 91 } },
        { "LOCATION_INVALID", Valid with { Longitude = -181 } },
        { "LOCATION_INVALID", Valid with { LocationAccuracyMetres = -1 } },
    };

    [Theory]
    [MemberData(nameof(BrokenFarmers))]
    public void A_farmer_that_breaks_a_rule_is_named(string expected, SyncFarmer farmer) =>
        Assert.Equal(expected, SyncRules.CheckFarmer(farmer));

    [Fact]
    public void A_complete_farmer_passes_also_with_no_phone_and_no_location()
    {
        Assert.Null(SyncRules.CheckFarmer(Valid));
        Assert.Null(SyncRules.CheckFarmer(Valid with { HasNoPhone = true, PhoneE164 = null, Latitude = null, Longitude = null }));
    }

    [Fact]
    public void A_visit_is_checked()
    {
        Assert.Null(SyncRules.CheckVisit(ValidVisit));
        Assert.Null(SyncRules.CheckVisit(ValidVisit with { Status = VisitStatus.Planned, CompletedAt = null }));
        Assert.Equal("RECORD_UNREADABLE", SyncRules.CheckVisit(ValidVisit with { ScheduledFor = default }));
        Assert.Equal("VISIT_END_REQUIRED", SyncRules.CheckVisit(ValidVisit with { CompletedAt = null }));
        Assert.Equal("NOTES_TOO_LONG", SyncRules.CheckVisit(ValidVisit with { Notes = new string('a', 2001) }));
    }

    [Fact]
    public void Phone_times_are_stored_in_utc_and_never_after_now()
    {
        var accra = new DateTimeOffset(2026, 10, 1, 10, 0, 0, TimeSpan.FromHours(1));

        Assert.Equal(TimeSpan.Zero, SyncMapping.NotAfter(accra, At.AddDays(1)).Offset);
        Assert.Equal(At, SyncMapping.NotAfter(At.AddYears(1), At));
    }
}
