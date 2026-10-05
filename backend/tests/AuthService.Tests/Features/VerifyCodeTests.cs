using AgroConnect.AuthService.Features;
using AgroConnect.AuthService.Models;
using AgroConnect.SharedLibrary.Enums;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace AgroConnect.AuthService.Tests.Features;

[IntegrationTest]
[Collection(DatabaseCollection.Name)]
public sealed class VerifyCodeTests(PostgresFixture database) : AuthTestBase(database)
{
    private Task RequestAsync(string phone, UserRole role) =>
        RequestCode.Handle(new RequestCodeRequest(phone, role), Db, Generator, Sms, Messages, Session, Clock, Options, CancellationToken.None);

    private async Task<AuthResponse> VerifyAsync(string phone, UserRole role, string code)
    {
        var result = await VerifyCode.Handle(new VerifyCodeRequest(phone, role, code), Db, Tokens, Clock, Options, CancellationToken.None);
        return result.Value!;
    }

    [Fact]
    public async Task Signs_in_an_officer_with_the_right_code()
    {
        var officer = await AddOfficerAsync();
        await RequestAsync(OfficerPhone, UserRole.Officer);

        var response = await VerifyAsync("0240000001", UserRole.Officer, Code);

        Assert.False(string.IsNullOrEmpty(response.Token));
        Assert.Equal(Clock.UtcNow.AddDays(7), response.ExpiresAt);
        Assert.Equal(officer.Id, response.User.Id);
        Assert.Equal(UserRole.Officer, response.User.Role);
        Assert.Equal("Savelugu", response.User.District);
        Assert.NotNull((await Db.LoginCodes.SingleAsync()).UsedAt);
    }

    [Fact]
    public async Task A_code_works_only_once()
    {
        await AddOfficerAsync();
        await RequestAsync(OfficerPhone, UserRole.Officer);
        await VerifyAsync(OfficerPhone, UserRole.Officer, Code);

        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "CODE_EXPIRED", () => VerifyAsync(OfficerPhone, UserRole.Officer, Code));
    }

    [Fact]
    public async Task Creates_the_farmer_account_on_first_sign_in_from_the_earliest_registration()
    {
        var first = await AddFarmerAsync("Ama Boateng", createdAt: Clock.UtcNow.AddDays(-2));
        await AddFarmerAsync("Kofi Boateng", createdAt: Clock.UtcNow.AddDays(-1)); // a family member on the same phone
        await RequestAsync(FarmerPhone, UserRole.Farmer);

        var response = await VerifyAsync(FarmerPhone, UserRole.Farmer, Code);

        Assert.Equal(UserRole.Farmer, response.User.Role);
        Assert.Equal(first.Id, response.User.FarmerId);
        Assert.Equal("Ama Boateng", response.User.FullName);
        Assert.Equal(1, await Db.Users.CountAsync(u => u.Role == UserRole.Farmer));

        // Signing in again uses the same account.
        Clock.Advance(TimeSpan.FromMinutes(1));
        await RequestAsync(FarmerPhone, UserRole.Farmer);
        var again = await VerifyAsync(FarmerPhone, UserRole.Farmer, Code);
        Assert.Equal(response.User.Id, again.User.Id);
    }

    [Fact]
    public async Task A_wrong_code_counts_an_attempt()
    {
        await AddOfficerAsync();
        await RequestAsync(OfficerPhone, UserRole.Officer);

        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "CODE_WRONG", () => VerifyAsync(OfficerPhone, UserRole.Officer, "000000"));

        await using var fresh = Database.CreateContext();
        Assert.Equal(1, (await fresh.LoginCodes.SingleAsync()).Attempts);
    }

    [Fact]
    public async Task Locks_the_code_after_five_wrong_tries()
    {
        await AddOfficerAsync();
        await RequestAsync(OfficerPhone, UserRole.Officer);
        for (var i = 0; i < 5; i++)
        {
            await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "CODE_WRONG", () => VerifyAsync(OfficerPhone, UserRole.Officer, "000000"));
        }

        await ApiAssert.FailsAsync(StatusCodes.Status429TooManyRequests, "TOO_MANY_ATTEMPTS", () => VerifyAsync(OfficerPhone, UserRole.Officer, Code));
    }

    [Fact]
    public async Task An_expired_code_is_refused()
    {
        await AddOfficerAsync();
        await RequestAsync(OfficerPhone, UserRole.Officer);
        Clock.Advance(TimeSpan.FromMinutes(11));

        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "CODE_EXPIRED", () => VerifyAsync(OfficerPhone, UserRole.Officer, Code));
    }

    [Fact]
    public async Task No_code_asked_for_is_reported_as_expired() =>
        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "CODE_EXPIRED", () => VerifyAsync(OfficerPhone, UserRole.Officer, Code));

    [Fact]
    public async Task An_unknown_number_cannot_sign_in_even_with_the_code()
    {
        await RequestAsync("0550000000", UserRole.Officer);

        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "CODE_WRONG", () => VerifyAsync("0550000000", UserRole.Officer, Code));
        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "CODE_EXPIRED", () => VerifyAsync("0550000000", UserRole.Farmer, Code));
    }

    [Fact]
    public async Task Rejects_a_bad_phone() =>
        await ApiAssert.FailsAsync(StatusCodes.Status400BadRequest, "INVALID_PHONE", () => VerifyAsync("abc", UserRole.Officer, Code));
}
