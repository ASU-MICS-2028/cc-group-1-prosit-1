using AgroConnect.AuthService.Features;
using AgroConnect.SharedLibrary.Errors;
using Microsoft.AspNetCore.Http;
using NSubstitute;

namespace AgroConnect.AuthService.Tests.Features;

[IntegrationTest]
[Collection(DatabaseCollection.Name)]
public sealed class GetMeTests(PostgresFixture database) : AuthTestBase(database)
{
    [Fact]
    public async Task Returns_the_signed_in_officer()
    {
        var officer = await AddOfficerAsync();
        Session.RequireUserId().Returns(officer.Id);

        var result = await GetMe.Handle(Db, Session, CancellationToken.None);

        Assert.Equal(officer.Id, result.Value!.Id);
        Assert.Equal("Fuseini Alhassan", result.Value.FullName);
        Assert.Equal(OfficerPhone, result.Value.Phone);
    }

    [Fact]
    public async Task A_token_for_a_removed_account_is_unauthorized()
    {
        Session.RequireUserId().Returns(Guid.CreateVersion7());

        await ApiAssert.FailsAsync(StatusCodes.Status401Unauthorized, "UNAUTHORIZED", () => GetMe.Handle(Db, Session, CancellationToken.None));
    }

    [Fact]
    public async Task Nobody_signed_in_is_unauthorized()
    {
        Session.RequireUserId().Returns(_ => throw new ApiException(StatusCodes.Status401Unauthorized, "UNAUTHORIZED"));

        await ApiAssert.FailsAsync(StatusCodes.Status401Unauthorized, "UNAUTHORIZED", () => GetMe.Handle(Db, Session, CancellationToken.None));
    }
}
