using System.Reflection;
using System.Text.Json;
using AgroConnect.SharedLibrary.Enums;

namespace AgroConnect.SharedLibrary.Messages;

/// <summary>
/// Reads every embedded Langs/*.json of an assembly. File shape:
/// [ { "Lang": "en", "Key": "NOT_FOUND", "Text": "We could not find that." } ]
/// </summary>
public sealed class AssemblyMessageSource(Assembly assembly) : IMessageSource
{
    private static readonly JsonSerializerOptions Options = new() { PropertyNameCaseInsensitive = true };

    public IEnumerable<MessageEntry> Load()
    {
        foreach (var resource in assembly.GetManifestResourceNames()
                     .Where(name => name.Contains(".Langs.", StringComparison.Ordinal) && name.EndsWith(".json", StringComparison.Ordinal)))
        {
            using var stream = assembly.GetManifestResourceStream(resource)!;
            var rows = JsonSerializer.Deserialize<List<Row>>(stream, Options) ?? [];

            foreach (var row in rows)
            {
                if (!LanguageCodes.TryParseCode(row.Lang, out var language))
                {
                    throw new InvalidDataException($"Unknown language '{row.Lang}' in {resource}.");
                }

                yield return new MessageEntry(language, row.Key, row.Text);
            }
        }
    }

    private sealed record Row(string Lang, string Key, string Text);
}
