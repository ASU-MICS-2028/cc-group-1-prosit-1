using AgroConnect.FarmerService.Features;
using AgroConnect.FarmerService.Models;
using AgroConnect.FarmerService.Providers.Interfaces;
using AgroConnect.FarmerService.Providers.Samples;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Errors;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace AgroConnect.FarmerService.Tests.Features;

[IntegrationTest]
[Collection(DatabaseCollection.Name)]
public sealed class FarmerEndpointTests(PostgresFixture database) : FarmerTestBase(database)
{
    [Fact]
    public async Task My_farm_has_the_record_the_officer_and_only_their_own_visits_newest_first()
    {
        var officer = await AddOfficerAsync();
        var ama = await AddFarmerAsync(officer);
        var kofi = await AddFarmerAsync(officer, "Kofi Asante");
        await AddVisitAsync(ama, officer, daysAgo: 10, VisitTopic.Seeds);
        await AddVisitAsync(ama, officer, daysAgo: 2, VisitTopic.Pests, VisitTopic.Weather);
        await AddVisitAsync(kofi, officer, daysAgo: 1, VisitTopic.Loans);
        SignInAs(ama);

        var result = await GetMyFarm.Handle(Db, Session, CancellationToken.None);

        var farm = result.Value!;
        Assert.Equal("Ama Boateng", farm.Farmer.FullName);
        Assert.Equal([Crop.Maize, Crop.Groundnut], farm.Farmer.Crops);
        Assert.Equal(2.5m, farm.Farmer.FarmSize);
        Assert.Equal(Language.Twi, farm.Farmer.Language);
        Assert.Equal(new OfficerContact("Fuseini Alhassan", officer.PhoneE164, "Savelugu"), farm.Officer);
        Assert.Equal(2, farm.Visits.Count);
        Assert.Equal([VisitTopic.Pests, VisitTopic.Weather], farm.Visits[0].Topics);
        Assert.Equal([VisitTopic.Seeds], farm.Visits[1].Topics);
    }

    [Fact]
    public async Task An_account_without_a_farm_is_refused()
    {
        Session.FarmerId.Returns((Guid?)null);

        var error = await Assert.ThrowsAsync<ApiException>(() => GetMyFarm.Handle(Db, Session, CancellationToken.None));

        Assert.Equal(StatusCodes.Status403Forbidden, error.StatusCode);
        Assert.Equal("NOT_A_FARMER_ACCOUNT", error.MessageKey);
    }

    [Fact]
    public async Task A_farm_that_is_gone_is_not_found()
    {
        Session.FarmerId.Returns(Guid.CreateVersion7());

        var error = await Assert.ThrowsAsync<ApiException>(() => GetPrices.Handle(Db, Session, new SampleMarketPriceProvider(Clock), CancellationToken.None));

        Assert.Equal(StatusCodes.Status404NotFound, error.StatusCode);
        Assert.Equal("FARMER_NOT_FOUND", error.MessageKey);
    }

    [Fact]
    public async Task Prices_put_the_farmers_own_crops_first()
    {
        var farmer = await AddFarmerAsync(await AddOfficerAsync(), change: f => f.Crops = [Crop.Yam]);
        SignInAs(farmer);

        var result = await GetPrices.Handle(Db, Session, new SampleMarketPriceProvider(Clock), CancellationToken.None);

        Assert.Equal(Crop.Yam, result.Value!.Prices[0].Crop);
        Assert.Equal(DataSource.Sample, result.Value.Source);
    }

    [Fact]
    public async Task Weather_is_for_the_farmers_community_or_else_their_district()
    {
        var officer = await AddOfficerAsync();
        var inTolon = await AddFarmerAsync(officer);
        var noCommunity = await AddFarmerAsync(officer, "Kofi", f => f.Community = null);
        var provider = new SampleWeatherProvider(Clock);

        SignInAs(inTolon);
        Assert.Equal("Tolon", (await GetWeather.Handle(Db, Session, provider, CancellationToken.None)).Value!.Place);
        SignInAs(noCommunity);
        Assert.Equal("Northern · Tolon District", (await GetWeather.Handle(Db, Session, provider, CancellationToken.None)).Value!.Place);
    }

    [Fact]
    public async Task Crop_check_needs_at_least_one_symptom()
    {
        SignInAs(await AddFarmerAsync(await AddOfficerAsync()));

        var error = await Assert.ThrowsAsync<ApiException>(() =>
            CheckCrop.Handle(new CropCheckRequest(Crop.Maize, []), Db, Session, new SampleCropAdviser(), CancellationToken.None));
        Assert.Equal("SYMPTOMS_REQUIRED", error.MessageKey);

        var result = await CheckCrop.Handle(
            new CropCheckRequest(Crop.Maize, [CropSymptom.HolesInLeaves]), Db, Session, new SampleCropAdviser(), CancellationToken.None);
        Assert.Equal(CropProblem.FallArmyworm, result.Value!.LikelyProblem);
    }

    [Fact]
    public async Task Harvest_cooperative_and_lessons_answer_for_the_signed_in_farmer()
    {
        SignInAs(await AddFarmerAsync(await AddOfficerAsync()));

        var harvest = await GetHarvestForecast.Handle(Db, Session, new SampleHarvestForecaster(), CancellationToken.None);
        var coop = await GetCooperative.Handle(Db, Session, new SampleCooperativeDirectory(Clock), CancellationToken.None);
        var lessons = await GetLessons.Handle(Db, Session, new SampleLessonCatalogue(), CancellationToken.None);

        Assert.Equal([Crop.Maize, Crop.Groundnut], harvest.Value!.Crops.Select(c => c.Crop));
        Assert.Equal("Tolon Farmers Cooperative", coop.Value!.Name);
        Assert.NotEmpty(lessons.Value!.Lessons);
    }

    [Fact]
    public async Task A_change_request_goes_to_the_officer_who_registered_the_farmer()
    {
        var officer = await AddOfficerAsync();
        var farmer = await AddFarmerAsync(officer);
        SignInAs(farmer);
        var inbox = Substitute.For<IChangeRequestInbox>();
        inbox.SubmitAsync(default, default, default!, default)
            .ReturnsForAnyArgs(new ChangeRequestResponse(DataSource.Sample, "CR-1"));

        var result = await RequestChange.Handle(
            new ChangeRequest(ChangeArea.Phone, "  My new number is 024 555 1234  "), Db, Session, inbox, CancellationToken.None);

        Assert.Equal("CR-1", result.Value!.Reference);
        await inbox.Received(1).SubmitAsync(
            farmer.Id,
            officer.Id,
            Arg.Is<ChangeRequest>(r => r.Area == ChangeArea.Phone && r.Details == "My new number is 024 555 1234"),
            Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task A_change_request_says_what_should_change(string details)
    {
        SignInAs(await AddFarmerAsync(await AddOfficerAsync()));
        var inbox = new LogOnlyChangeRequestInbox(Clock, NullLogger<LogOnlyChangeRequestInbox>.Instance);

        var error = await Assert.ThrowsAsync<ApiException>(() =>
            RequestChange.Handle(new ChangeRequest(ChangeArea.Other, details), Db, Session, inbox, CancellationToken.None));

        Assert.Equal("CHANGE_DETAILS_REQUIRED", error.MessageKey);
    }
}
