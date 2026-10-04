using System.Globalization;
using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.SharedLibrary.Messages;

public sealed class MessageProvider(IEnumerable<IMessageSource> sources) : IMessageProvider
{
    private readonly Lazy<Dictionary<(Language, string), string>> _messages = new(() =>
    {
        var all = new Dictionary<(Language, string), string>();
        foreach (var entry in sources.SelectMany(source => source.Load()))
        {
            all[(entry.Language, entry.Key)] = entry.Text;
        }

        return all;
    });

    public string Get(string key, Language language, params object[] args)
    {
        var messages = _messages.Value;
        if (!messages.TryGetValue((language, key), out var text) && !messages.TryGetValue((Language.English, key), out text))
        {
            return key;
        }

        return args.Length == 0 ? text : string.Format(CultureInfo.InvariantCulture, text, args);
    }
}
