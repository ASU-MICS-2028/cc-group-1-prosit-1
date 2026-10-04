using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.SharedLibrary.Messages;

public interface IMessageProvider
{
    /// <summary>
    /// The text for a key in a language, with {0}, {1} filled from args. Falls back to English,
    /// then to the key itself, so a missing translation never breaks a response.
    /// </summary>
    string Get(string key, Language language, params object[] args);
}
