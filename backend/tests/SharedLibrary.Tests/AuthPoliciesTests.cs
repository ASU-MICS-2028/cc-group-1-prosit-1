using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Security;

namespace AgroConnect.SharedLibrary.Tests;

[UnitTest]
public sealed class AuthPoliciesTests
{
    [Theory]
    [InlineData(UserRole.Officer, "officer")]
    [InlineData(UserRole.Farmer, "farmer")]
    [InlineData(UserRole.Admin, "admin")]
    public void Each_role_has_its_policy(UserRole role, string policy) => Assert.Equal(policy, AuthPolicies.For(role));

    [Fact]
    public void An_unknown_role_is_a_bug() =>
        Assert.Throws<ArgumentOutOfRangeException>(() => AuthPolicies.For((UserRole)99));
}
