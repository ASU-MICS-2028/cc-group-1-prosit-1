using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SyncService.Features;
using AgroConnect.SyncService.Models;
using Microsoft.AspNetCore.Http;

namespace AgroConnect.SyncService.Tests.Features;

[IntegrationTest]
[Collection(DatabaseCollection.Name)]
public sealed class SyncRecordsTests(PostgresFixture database) : SyncTestBase(database)
{
    [Fact]
    public async Task A_farmer_registered_offline_is_stored_for_the_signed_in_officer()
    {
        var id = Guid.CreateVersion7();

        var results = await SyncAsync(farmers: [FarmerFromPhone(id)]);

        Assert.Equal([new SyncResult(id, SyncOutcome.Created)], results);
        var stored = await StoredFarmerAsync(id);
        Assert.NotNull(stored);
        Assert.Equal(Officer.Id, stored.RegisteredById);
        Assert.Equal("Ama Boateng", stored.FullName);
        Assert.Equal("+233241000001", stored.PhoneE164);
        Assert.Equal(Language.Twi, stored.Language);
        Assert.Equal([Crop.Maize, Crop.Groundnut], stored.Crops);
        Assert.Equal("Tolon", stored.Community);
        Assert.Null(stored.RegionDistrict);
        Assert.Equal(2.5m, stored.FarmSize);
        Assert.Equal(PhoneType.BasicPhone, stored.PhoneType);
        Assert.Equal([HelpNeed.Seeds, HelpNeed.Pests], stored.HelpNeeded);
        Assert.Equal(Clock.UtcNow, stored.ServerUpdatedAt);
        Assert.Equal(Clock.UtcNow.AddMinutes(-30), stored.ClientUpdatedAt);
    }

    [Fact]
    public async Task Sending_the_same_batch_again_changes_nothing()
    {
        var farmer = FarmerFromPhone();
        var visit = VisitFromPhone(farmer["id"]!);
        await SyncAsync([farmer], [visit]);
        Clock.Advance(TimeSpan.FromMinutes(5));

        var results = await SyncAsync([farmer], [visit]);

        Assert.All(results, r => Assert.Equal(SyncOutcome.Unchanged, r.Outcome));
        Assert.Equal(2, results.Count);
        var stored = await StoredFarmerAsync(Guid.Parse((string)farmer["id"]!));
        Assert.Equal(Clock.UtcNow.AddMinutes(-5), stored!.ServerUpdatedAt);
    }

    [Fact]
    public async Task The_newest_change_wins()
    {
        var existing = await AddFarmerAsync(Officer, changedAt: Clock.UtcNow.AddHours(-2));
        var newer = FarmerFromPhone(existing.Id, Clock.UtcNow.AddHours(-1));
        newer["fullName"] = "Kofi Asante Mensah";

        Assert.Equal(SyncOutcome.Updated, (await SyncAsync([newer])).Single().Outcome);

        var older = FarmerFromPhone(existing.Id, Clock.UtcNow.AddHours(-3));
        older["fullName"] = "Old name";
        Assert.Equal(SyncOutcome.Unchanged, (await SyncAsync([older])).Single().Outcome);

        var stored = await StoredFarmerAsync(existing.Id);
        Assert.Equal("Kofi Asante Mensah", stored!.FullName);
        Assert.Equal(existing.CreatedAt, stored.CreatedAt);
        Assert.Equal(Officer.Id, stored.RegisteredById);
    }

    [Fact]
    public async Task An_officer_cannot_change_another_officers_farmer()
    {
        var other = await AddOfficerAsync("Abena Owusu");
        var theirs = await AddFarmerAsync(other);
        var change = FarmerFromPhone(theirs.Id, Clock.UtcNow);
        change["fullName"] = "Taken over";

        var results = await SyncAsync([change]);

        Assert.Equal([new SyncResult(theirs.Id, SyncOutcome.Forbidden, Text("NOT_YOUR_FARMER"))], results);
        Assert.Equal("Kofi Asante", (await StoredFarmerAsync(theirs.Id))!.FullName);
    }

    [Fact]
    public async Task A_record_that_breaks_a_rule_is_explained_and_the_rest_are_still_stored()
    {
        var bad = FarmerFromPhone();
        bad["phoneE164"] = "+23324";
        var good = FarmerFromPhone();

        var results = await SyncAsync([bad, good]);

        Assert.Equal(SyncOutcome.Invalid, results[0].Outcome);
        Assert.Equal(Text("PHONE_INVALID"), results[0].Problem);
        Assert.Equal(SyncOutcome.Created, results[1].Outcome);
        Assert.Null(await StoredFarmerAsync(results[0].Id));
        Assert.NotNull(await StoredFarmerAsync(results[1].Id));
    }

    [Fact]
    public async Task A_record_the_server_cannot_read_is_answered_and_one_without_an_id_is_skipped()
    {
        var unknownCrop = FarmerFromPhone();
        unknownCrop["crops"] = new[] { "coffee" };
        var numberForCrop = FarmerFromPhone();
        numberForCrop["crops"] = new[] { 0 };
        var noId = FarmerFromPhone();
        noId["id"] = "not-an-id";

        var results = await SyncAsync([unknownCrop, numberForCrop, noId]);

        Assert.Equal(2, results.Count);
        Assert.All(results, r => Assert.Equal((SyncOutcome.Invalid, Text("RECORD_UNREADABLE")), (r.Outcome, r.Problem)));
    }

    [Fact]
    public async Task A_farmer_with_no_phone_keeps_no_number()
    {
        var farmer = FarmerFromPhone();
        farmer["hasNoPhone"] = true;
        farmer["phoneE164"] = "+233241000001";

        var result = (await SyncAsync([farmer])).Single();

        Assert.Equal(SyncOutcome.Created, result.Outcome);
        Assert.Null((await StoredFarmerAsync(result.Id))!.PhoneE164);
    }

    [Fact]
    public async Task A_phone_with_its_clock_in_the_future_is_stored_as_now()
    {
        var farmer = FarmerFromPhone(changedAt: Clock.UtcNow.AddYears(1));

        var result = (await SyncAsync([farmer])).Single();

        var stored = await StoredFarmerAsync(result.Id);
        Assert.Equal(Clock.UtcNow, stored!.ClientUpdatedAt);
        Assert.Equal(Clock.UtcNow, stored.CreatedAt);
        Assert.Equal(Clock.UtcNow, stored.ConsentAt);
    }

    [Fact]
    public async Task The_same_record_twice_in_one_batch_keeps_the_newest()
    {
        var id = Guid.CreateVersion7();
        var first = FarmerFromPhone(id, Clock.UtcNow.AddMinutes(-10));
        first["fullName"] = "First";
        var second = FarmerFromPhone(id, Clock.UtcNow.AddMinutes(-5));
        second["fullName"] = "Second";

        var results = await SyncAsync([second, first]);

        Assert.Equal([new SyncResult(id, SyncOutcome.Created)], results);
        Assert.Equal("Second", (await StoredFarmerAsync(id))!.FullName);
    }

    [Fact]
    public async Task A_visit_goes_with_its_farmer_in_the_same_batch_and_belongs_to_the_officer()
    {
        var farmer = FarmerFromPhone();
        var visitId = Guid.CreateVersion7();

        var results = await SyncAsync([farmer], [VisitFromPhone(farmer["id"]!, visitId)]);

        Assert.Equal(new SyncResult(visitId, SyncOutcome.Created), results[1]);
        var stored = await StoredVisitAsync(visitId);
        Assert.Equal(Officer.Id, stored!.OfficerId);
        Assert.Equal(VisitStatus.Done, stored.Status);
        Assert.Equal(new DateOnly(2026, 10, 1), stored.ScheduledFor);
        Assert.Equal([VisitTopic.Pests, VisitTopic.Weather], stored.Topics);
        Assert.Equal([FarmObservation.Pests], stored.Observations);
        Assert.Equal("Fall armyworm on the east side", stored.Notes);
    }

    [Fact]
    public async Task A_visit_whose_farmer_is_not_on_the_server_gets_no_answer_so_it_stays_queued()
    {
        var refused = FarmerFromPhone();
        refused["consentGiven"] = false;

        var results = await SyncAsync([refused], [VisitFromPhone(refused["id"]!), VisitFromPhone(Guid.CreateVersion7())]);

        Assert.Equal([new SyncResult(Guid.Parse((string)refused["id"]!), SyncOutcome.Invalid, Text("CONSENT_REQUIRED"))], results);
    }

    [Fact]
    public async Task Visits_to_another_officers_farmer_or_by_another_officer_are_refused()
    {
        var other = await AddOfficerAsync("Abena Owusu");
        var theirFarmer = await AddFarmerAsync(other);
        var myFarmer = await AddFarmerAsync(Officer);
        var theirVisit = await AddVisitAsync(myFarmer, other);

        var results = await SyncAsync(visits:
        [
            VisitFromPhone(theirFarmer.Id),
            VisitFromPhone(myFarmer.Id, theirVisit.Id, Clock.UtcNow),
        ]);

        Assert.Equal((SyncOutcome.Forbidden, Text("NOT_YOUR_FARMER")), (results[0].Outcome, results[0].Problem));
        Assert.Equal((SyncOutcome.Forbidden, Text("NOT_YOUR_VISIT")), (results[1].Outcome, results[1].Problem));
    }

    [Fact]
    public async Task A_visit_is_updated_by_a_newer_change_and_checked_against_the_rules()
    {
        var farmer = await AddFarmerAsync(Officer);
        var visit = await AddVisitAsync(farmer, Officer);
        var newer = VisitFromPhone(farmer.Id, visit.Id, Clock.UtcNow.AddMinutes(-1));
        var older = VisitFromPhone(farmer.Id, visit.Id, Clock.UtcNow.AddDays(-2));
        var unfinished = VisitFromPhone(farmer.Id);
        unfinished["completedAt"] = null;
        var unreadable = VisitFromPhone(farmer.Id);
        unreadable["status"] = "cancelled";

        Assert.Equal(SyncOutcome.Updated, (await SyncAsync(visits: [newer])).Single().Outcome);
        Assert.Equal(SyncOutcome.Unchanged, (await SyncAsync(visits: [older])).Single().Outcome);
        var results = await SyncAsync(visits: [unfinished, unreadable]);

        Assert.Equal(Text("VISIT_END_REQUIRED"), results[0].Problem);
        Assert.Equal(Text("RECORD_UNREADABLE"), results[1].Problem);
        Assert.Equal("Fall armyworm on the east side", (await StoredVisitAsync(visit.Id))!.Notes);
    }

    [Fact]
    public async Task Only_the_first_500_of_a_kind_are_answered_the_rest_go_next_time()
    {
        var farmers = Enumerable.Range(0, SyncRecords.MaxRecordsPerKind + 1).Select(_ =>
        {
            var farmer = FarmerFromPhone();
            farmer["consentGiven"] = false;
            return farmer;
        });

        var results = await SyncAsync(farmers);

        Assert.Equal(SyncRecords.MaxRecordsPerKind, results.Count);
    }

    [Theory]
    [InlineData("[]")]
    [InlineData("null")]
    [InlineData("{ \"farmers\": 5 }")]
    [InlineData("not json")]
    public async Task A_body_that_is_not_a_batch_is_a_bad_request(string json)
    {
        var error = await Assert.ThrowsAsync<ApiException>(() => SyncRawAsync(json));

        Assert.Equal(StatusCodes.Status400BadRequest, error.StatusCode);
        Assert.Equal("SYNC_BODY_INVALID", error.MessageKey);
    }

    [Fact]
    public async Task Missing_lists_are_an_empty_batch()
    {
        Assert.Empty(await SyncRawAsync("{}"));
    }
}
