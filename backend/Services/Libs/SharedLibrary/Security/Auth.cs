namespace AgroConnect.SharedLibrary.Security;

/// <summary>Claim names in the sign-in token. Kept short: the token travels on every request over 2G.</summary>
public static class AuthClaims
{
    public const string UserId = "sub";
    public const string Role = "role";
    public const string FarmerId = "farmer_id";
}

/// <summary>Authorization policies features can require, e.g. <c>.RequireAuthorization(AuthPolicies.Officer)</c>.</summary>
public static class AuthPolicies
{
    public const string Officer = "officer";
    public const string Farmer = "farmer";
}
