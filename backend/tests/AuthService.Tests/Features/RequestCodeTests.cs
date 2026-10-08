using AgroConnect.AuthService.Features;
using AgroConnect.AuthService.Models;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.ValueObjects;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using NSubstitute;

namespace AgroConnect.AuthService.Tests.Features;

[IntegrationTest]
[Collection(DatabaseCollection.Name)]
public sealed class RequestCodeTests(PostgresFixture database) : AuthTestBase(database)
{
    private Task<Microsoft.AspNetCore.Http.HttpResults.Accepted<RequestCodeResponse>> SendAsync(string phone, UserRole role) =>
        RequestCode.Handle(new RequestCodeRequest(phone, role), Db, Generator, Sms, Messages, Session, Clock, Options, CancellationToken.None);

    [Fact]
    public async Task Texts_the_code_to_a_known_officer_and_stores_only_a_hash()
    {
        await AddOfficerAsync();

        var result = await SendAsync("024 000 0001", UserRole.Officer);

        Assert.Equal(StatusCodes.Status202Accepted, result.StatusCode);
        Assert.Equal(new RequestCodeResponse(45, 600), result.Value);
        await Sms.Received(1).SendAsync(
            PhoneNumber.Parse(OfficerPhone),
            Arg.Is<string>(m => m.Contains(Code, StringComparison.Ordinal)),
            Arg.Any<CancellationToken>());

        var stored = await Db.LoginCodes.SingleAsync();
        Assert.Equal(OfficerPhone, stored.PhoneE164);
        Assert.DoesNotContain(Code, stored.CodeHash, StringComparison.Ordinal);
        Assert.Equal(Clock.UtcNow.AddMinutes(10), stored.ExpiresAt);
    }

    [Fact]
    public async Task Texts_a_registered_farmer()
    {
        await AddFarmerAsync();

        await SendAsync(FarmerPhone, UserRole.Farmer);

        await Sms.Received(1).SendAsync(Arg.Any<PhoneNumber>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Answers_the_same_for_an_unknown_number_but_sends_nothing()
    {
        var result = await SendAsync("0550000000", UserRole.Officer);

        Assert.Equal(StatusCodes.Status202Accepted, result.StatusCode);
        await Sms.DidNotReceiveWithAnyArgs().SendAsync(default, default!, default);
        Assert.Equal(1, await Db.LoginCodes.CountAsync());
    }

    [Fact]
    public async Task A_farmer_number_does_not_get_an_officer_code()
    {
        await AddFarmerAsync();

        await SendAsync(FarmerPhone, UserRole.Officer);

        await Sms.DidNotReceiveWithAnyArgs().SendAsync(default, default!, default);
    }

    [Fact]
    public async Task Texts_a_known_admin_but_not_an_officer_asking_as_admin()
    {
        await AddOfficerAsync(AdminPhone, UserRole.Admin);
        await AddOfficerAsync();

        await SendAsync(AdminPhone, UserRole.Admin);
        await SendAsync(OfficerPhone, UserRole.Admin);

        await Sms.Received(1).SendAsync(PhoneNumber.Parse(AdminPhone), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Rejects_a_number_that_is_not_a_Ghana_number() =>
        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "INVALID_PHONE", () => SendAsync("12345", UserRole.Officer));

    [Fact]
    public async Task Asks_to_wait_before_resending()
    {
        await SendAsync(OfficerPhone, UserRole.Officer);
        Clock.Advance(TimeSpan.FromSeconds(30));

        await ApiAssert.FailsAsync(StatusCodes.Status429TooManyRequests, "RESEND_TOO_SOON", () => SendAsync(OfficerPhone, UserRole.Officer));

        Clock.Advance(TimeSpan.FromSeconds(16));
        var again = await SendAsync(OfficerPhone, UserRole.Officer);
        Assert.Equal(StatusCodes.Status202Accepted, again.StatusCode);
    }

    [Fact]
    public async Task Stops_after_five_codes_in_an_hour()
    {
        for (var i = 0; i < 5; i++)
        {
            await SendAsync(OfficerPhone, UserRole.Officer);
            Clock.Advance(TimeSpan.FromMinutes(1));
        }

        await ApiAssert.FailsAsync(StatusCodes.Status429TooManyRequests, "TOO_MANY_CODES", () => SendAsync(OfficerPhone, UserRole.Officer));

        Clock.Advance(TimeSpan.FromHours(1));
        var later = await SendAsync(OfficerPhone, UserRole.Officer);
        Assert.Equal(StatusCodes.Status202Accepted, later.StatusCode);
    }
}
