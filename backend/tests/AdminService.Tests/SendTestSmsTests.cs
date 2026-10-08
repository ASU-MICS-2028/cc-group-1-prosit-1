using AgroConnect.AdminService.Features;
using AgroConnect.Data.Entities;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using AgroConnect.SharedLibrary.ValueObjects;
using Microsoft.AspNetCore.Http;
using NSubstitute;

namespace AgroConnect.AdminService.Tests;

[IntegrationTest]
[Collection(DatabaseCollection.Name)]
public sealed class SendTestSmsTests(PostgresFixture database) : IAsyncLifetime
{
    private readonly ISessionProvider _session = Substitute.For<ISessionProvider>();
    private readonly ISmsSender _sms = Substitute.For<ISmsSender>();
    private AppUser _admin = null!;

    public async Task InitializeAsync()
    {
        await database.ResetAsync();
        _admin = new AppUser
        {
            Id = Guid.CreateVersion7(),
            Role = UserRole.Admin,
            PhoneE164 = "+233240000009",
            FullName = "Esi Owusu",
            Region = "Northern",
            CreatedAt = DateTimeOffset.UtcNow,
        };
        await using var db = database.CreateContext();
        db.Users.Add(_admin);
        await db.SaveChangesAsync();
        _session.RequireUserId().Returns(_admin.Id);
        _sms.SendAsync(default, default!, default).ReturnsForAnyArgs(new SmsResult(SmsOutcome.Sent));
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private async Task<TestSmsResponse> SendAsync(string? phone)
    {
        await using var db = database.CreateContext();
        return (await SendTestSms.Handle(new TestSmsRequest(phone), db, _session, _sms, CancellationToken.None)).Value!;
    }

    [Fact]
    public async Task Texts_the_admins_own_phone_by_default_or_the_number_given()
    {
        Assert.Equal(new TestSmsResponse(SmsOutcome.Sent, null), await SendAsync(null));
        await SendAsync("054 000 0099");

        await _sms.Received(1).SendAsync(PhoneNumber.Parse("+233240000009"), Arg.Any<string>(), Arg.Any<CancellationToken>());
        await _sms.Received(1).SendAsync(PhoneNumber.Parse("+233540000099"), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Reports_the_providers_reason_and_refuses_a_number_that_is_not_ghanaian()
    {
        _sms.SendAsync(default, default!, default).ReturnsForAnyArgs(new SmsResult(SmsOutcome.Failed, "Insufficient balance"));

        Assert.Equal(new TestSmsResponse(SmsOutcome.Failed, "Insufficient balance"), await SendAsync(null));
        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "INVALID_PHONE", () => SendAsync("12345"));
    }
}
