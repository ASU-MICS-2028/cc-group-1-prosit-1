namespace AgroConnect.SharedLibrary.Errors;

/// <summary>
/// An expected failure a feature wants to report ("not found", "not allowed"). Carries a message KEY, not
/// text, so the answer comes back in the caller's language. Anything else thrown is a 500.
/// </summary>
public sealed class ApiException(int statusCode, string messageKey, params object[] messageArgs) : Exception(messageKey)
{
    public int StatusCode { get; } = statusCode;

    public string MessageKey { get; } = messageKey;

    public object[] MessageArgs { get; } = messageArgs;
}
