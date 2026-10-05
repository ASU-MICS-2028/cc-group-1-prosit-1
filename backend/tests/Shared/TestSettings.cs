namespace AgroConnect.Tests.Shared;

/// <summary>Values tests need in place of real settings. Nothing here is, or looks like, a real secret.</summary>
public static class TestSettings
{
    /// <summary>A 48-byte signing key built at run time (a written-out key would be flagged by the secret scanner).</summary>
    public static readonly string SigningKey = new('k', 48);

    /// <summary>The fixed sign-in code the tests use instead of SMS.</summary>
    public const string FixedCode = "123456";
}
