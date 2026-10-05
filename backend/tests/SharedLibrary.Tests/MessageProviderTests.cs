using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Messages;

namespace AgroConnect.SharedLibrary.Tests;

[UnitTest]
public class MessageProviderTests
{
    private sealed class FakeSource(params MessageEntry[] entries) : IMessageSource
    {
        public IEnumerable<MessageEntry> Load() => entries;
    }

    private static MessageProvider Provider() => new([
        new FakeSource(
            new MessageEntry(Language.English, "HELLO", "Hello"),
            new MessageEntry(Language.English, "WELCOME", "Welcome, {0}"),
            new MessageEntry(Language.Twi, "HELLO", "Akwaaba")),
        new FakeSource(new MessageEntry(Language.English, "BYE", "Goodbye")),
    ]);

    [Fact]
    public void Returns_the_text_in_the_requested_language()
    {
        Assert.Equal("Akwaaba", Provider().Get("HELLO", Language.Twi));
    }

    [Fact]
    public void Falls_back_to_english_when_the_language_has_no_translation()
    {
        Assert.Equal("Goodbye", Provider().Get("BYE", Language.Ewe));
    }

    [Fact]
    public void Returns_the_key_when_no_language_has_it()
    {
        Assert.Equal("UNKNOWN_KEY", Provider().Get("UNKNOWN_KEY", Language.English));
    }

    [Fact]
    public void Fills_in_arguments()
    {
        Assert.Equal("Welcome, Akosua", Provider().Get("WELCOME", Language.English, "Akosua"));
    }

    [Fact]
    public void Reads_the_messages_embedded_in_the_shared_library()
    {
        var provider = new MessageProvider([new AssemblyMessageSource(typeof(SharedLibraryExtension).Assembly)]);

        Assert.Equal("We could not find what you asked for.", provider.Get("NOT_FOUND", Language.English));
    }
}
