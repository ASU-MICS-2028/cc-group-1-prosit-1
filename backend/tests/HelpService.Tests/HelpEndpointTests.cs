using AgroConnect.Data.Entities;
using AgroConnect.HelpService.Features;
using AgroConnect.HelpService.Models;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace AgroConnect.HelpService.Tests;

[CollectionDefinition(Name)]
public sealed class DatabaseCollection : ICollectionFixture<PostgresFixture>
{
    public const string Name = "database";
}

/// <summary>A farmer's question from asking to answer to feedback, and the admin stepping in (ADR 0035).</summary>
[IntegrationTest]
[Collection(DatabaseCollection.Name)]
public sealed class HelpEndpointTests(PostgresFixture database) : IAsyncLifetime
{
    private readonly TestClock _clock = new();
    private AppUser _officer = null!;
    private AppUser _otherOfficer = null!;
    private AppUser _admin = null!;
    private Farmer _farmer = null!;

    public async Task InitializeAsync()
    {
        await database.ResetAsync();
        await using var db = database.CreateContext();
        _officer = User(UserRole.Officer, "+233240000001", "Kofi Asante", "Tolon");
        _otherOfficer = User(UserRole.Officer, "+233240000002", "Fuseini Alhassan", "Savelugu");
        _admin = User(UserRole.Admin, "+233240000009", "Esi Owusu", null);
        _farmer = new Farmer
        {
            Id = Guid.CreateVersion7(),
            RegisteredById = _officer.Id,
            FullName = "Hawa Issah",
            PhoneE164 = "+233241000001",
            Community = "Tolon",
            RegionDistrict = "Northern",
            Crops = [Crop.Maize],
            CreatedAt = _clock.UtcNow,
        };
        db.Users.AddRange(_officer, _otherOfficer, _admin);
        db.Farmers.Add(_farmer);
        await db.SaveChangesAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private AppUser User(UserRole role, string phone, string name, string? district) => new()
    {
        Id = Guid.CreateVersion7(),
        Role = role,
        PhoneE164 = phone,
        FullName = name,
        Region = "Northern",
        District = district,
        CreatedAt = _clock.UtcNow,
    };

    private static ISessionProvider As(Guid userId, Guid? farmerId = null)
    {
        var session = Substitute.For<ISessionProvider>();
        session.UserId.Returns(userId);
        session.RequireUserId().Returns(userId);
        session.FarmerId.Returns(farmerId);
        return session;
    }

    private ISessionProvider Farmer => As(Guid.NewGuid(), _farmer.Id);

    private async Task<HelpRequestInfo> AskAsync(AskRequest request)
    {
        await using var db = database.CreateContext();
        return (await AskForHelp.Handle(request, db, Farmer, _clock, CancellationToken.None)).Value!;
    }

    [Fact]
    public async Task A_question_goes_to_the_farmers_own_officer_and_comes_back_answered()
    {
        var voice = Convert.ToBase64String(new byte[] { 1, 2, 3, 4 });
        var asked = await AskAsync(new AskRequest(HelpCategory.Crops, " Holes in my maize ", Crop.Maize, "fall_armyworm", voice, "audio/webm;codecs=opus", 18));
        Assert.Equal(HelpStatus.Waiting, asked.Status);
        Assert.Equal("Holes in my maize", asked.Text);
        Assert.Equal("Kofi Asante", asked.OfficerName);
        Assert.True(asked.HasVoiceNote);

        await using (var db = database.CreateContext())
        {
            var mine = (await GetOfficerRequests.Handle(db, As(_officer.Id), _clock, CancellationToken.None)).Value!;
            Assert.Equal(1, mine.Open);
            Assert.Equal("Hawa Issah", Assert.Single(mine.Requests).FarmerName);
            var other = (await GetOfficerRequests.Handle(db, As(_otherOfficer.Id), _clock, CancellationToken.None)).Value!;
            Assert.Empty(other.Requests);

            var audio = await GetHelpVoiceNote.Handle(asked.Id, db, As(_officer.Id), CancellationToken.None);
            Assert.NotNull(audio);
            await Assert.ThrowsAsync<ApiException>(() => GetHelpVoiceNote.Handle(asked.Id, db, As(_otherOfficer.Id), CancellationToken.None));
        }

        await using (var db = database.CreateContext())
        {
            var answered = (await AnswerRequestFeature.Handle(
                asked.Id, new AnswerRequest("Crush the egg masses. I will visit on Friday."), db, As(_officer.Id), _clock,
                NullLogger<AnswerRequestFeature>.Instance, CancellationToken.None)).Value!;
            Assert.Equal(HelpStatus.Answered, answered.Status);
        }

        await using (var db = database.CreateContext())
        {
            var list = (await GetMyHelpRequests.Handle(db, Farmer, CancellationToken.None)).Value!;
            Assert.Equal("Crush the egg masses. I will visit on Friday.", Assert.Single(list).Answer);
            var notYet = (await GiveHelpFeedback.Handle(asked.Id, new FeedbackRequest(false), db, Farmer, _clock, CancellationToken.None)).Value!;
            Assert.Equal(HelpStatus.StillNeedsHelp, notYet.Status);
        }
    }

    [Fact]
    public async Task An_empty_or_too_long_question_or_a_bad_recording_is_refused()
    {
        var empty = await Assert.ThrowsAsync<ApiException>(() => AskAsync(new AskRequest(HelpCategory.Other, "  ", null, null, null, null, null)));
        Assert.Equal("HELP_EMPTY", empty.MessageKey);
        var tooLong = await Assert.ThrowsAsync<ApiException>(() => AskAsync(new AskRequest(HelpCategory.Other, new string('a', 1001), null, null, null, null, null)));
        Assert.Equal("HELP_TOO_LONG", tooLong.MessageKey);
        var badType = await Assert.ThrowsAsync<ApiException>(() => AskAsync(new AskRequest(HelpCategory.Other, null, null, null, "AAAA", "video/mp4", 3)));
        Assert.Equal("VOICE_NOTE_INVALID", badType.MessageKey);
        var notBase64 = await Assert.ThrowsAsync<ApiException>(() => AskAsync(new AskRequest(HelpCategory.Other, null, null, null, "%%%", "audio/webm", 3)));
        Assert.Equal("VOICE_NOTE_INVALID", notBase64.MessageKey);
    }

    [Fact]
    public async Task Feedback_needs_an_answer_and_advice_needs_words()
    {
        var asked = await AskAsync(new AskRequest(HelpCategory.Money, "When is my loan due?", null, null, null, null, null));
        await using var db = database.CreateContext();
        var early = await Assert.ThrowsAsync<ApiException>(() => GiveHelpFeedback.Handle(asked.Id, new FeedbackRequest(true), db, Farmer, _clock, CancellationToken.None));
        Assert.Equal("HELP_NOT_ANSWERED", early.MessageKey);
        var blank = await Assert.ThrowsAsync<ApiException>(() => AnswerRequestFeature.Handle(
            asked.Id, new AnswerRequest(" "), db, As(_officer.Id), _clock, NullLogger<AnswerRequestFeature>.Instance, CancellationToken.None));
        Assert.Equal("ANSWER_REQUIRED", blank.MessageKey);
        var notTheirs = await Assert.ThrowsAsync<ApiException>(() => AnswerRequestFeature.Handle(
            asked.Id, new AnswerRequest("Yes"), db, As(_otherOfficer.Id), _clock, NullLogger<AnswerRequestFeature>.Instance, CancellationToken.None));
        Assert.Equal("HELP_NOT_FOUND", notTheirs.MessageKey);
        var farmerIsNotOfficer = await Assert.ThrowsAsync<ApiException>(() => GetOfficerRequests.Handle(db, As(_admin.Id), _clock, CancellationToken.None));
        Assert.Equal("NOT_AN_OFFICER_ACCOUNT", farmerIsNotOfficer.MessageKey);
    }

    [Fact]
    public async Task The_admin_sees_overdue_questions_and_reassigns_or_reminds()
    {
        var asked = await AskAsync(new AskRequest(HelpCategory.Crops, "Yellow leaves", Crop.Maize, null, null, null, null));
        _clock.Advance(TimeSpan.FromHours(30));

        await using (var db = database.CreateContext())
        {
            var desk = (await GetHelpDesk.Handle(db, As(_admin.Id), _clock, CancellationToken.None)).Value!;
            Assert.Equal(1, desk.Waiting);
            Assert.Equal(1, desk.Overdue);
            Assert.True(Assert.Single(desk.Requests).Overdue);
            Assert.Equal(2, desk.Officers.Count);
        }

        await using (var db = database.CreateContext())
        {
            var reminded = (await RemindOfficer.Handle(asked.Id, db, As(_admin.Id), _clock, NullLogger<RemindOfficer>.Instance, CancellationToken.None)).Value!;
            Assert.NotNull(reminded.RemindedAt);
            var moved = (await ReassignHelpRequest.Handle(asked.Id, new ReassignRequest(_otherOfficer.Id), db, As(_admin.Id), _clock, CancellationToken.None)).Value!;
            Assert.Equal("Fuseini Alhassan", moved.OfficerName);
            var outside = await Assert.ThrowsAsync<ApiException>(() =>
                ReassignHelpRequest.Handle(asked.Id, new ReassignRequest(Guid.NewGuid()), db, As(_admin.Id), _clock, CancellationToken.None));
            Assert.Equal("OFFICER_NOT_IN_AREA", outside.MessageKey);
        }

        await using (var db = database.CreateContext())
        {
            var officerOnly = await Assert.ThrowsAsync<ApiException>(() => GetHelpDesk.Handle(db, As(_officer.Id), _clock, CancellationToken.None));
            Assert.Equal("NOT_AN_ADMIN_ACCOUNT", officerOnly.MessageKey);
        }
    }
}

public sealed class HelpServiceExtensionTests
{
    [Fact]
    public void Registers_every_help_endpoint()
    {
        var services = new Microsoft.Extensions.DependencyInjection.ServiceCollection();
        services.AddHelpService();
        var features = services.Where(s => s.ServiceType == typeof(AgroConnect.SharedLibrary.Features.IFeature)).ToList();
        Assert.Equal(9, features.Count);
    }
}
