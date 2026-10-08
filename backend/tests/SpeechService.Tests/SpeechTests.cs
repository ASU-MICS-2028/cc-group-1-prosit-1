using System.Net;
using System.Text;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SpeechService.Features;
using AgroConnect.SpeechService.Providers;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AgroConnect.SpeechService.Tests;

[CollectionDefinition(Name)]
public sealed class DatabaseCollection : ICollectionFixture<PostgresFixture>
{
    public const string Name = "database";
}

/// <summary>Khaya answers by hand-written fakes: tests never reach the real API.</summary>
internal sealed class FakeKhaya(Func<HttpRequestMessage, HttpResponseMessage> answer) : HttpMessageHandler
{
    public List<string> Calls { get; } = [];

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Calls.Add(request.RequestUri!.AbsolutePath);
        return Task.FromResult(answer(request));
    }
}

public sealed class KhayaProviderTests
{
    private static (KhayaSpeechProvider, FakeKhaya) Provider(Func<HttpRequestMessage, HttpResponseMessage> answer)
    {
        var fake = new FakeKhaya(answer);
        var http = new HttpClient(fake);
        KhayaSpeechProvider.Configure(http, new KhayaOptions { ApiKey = "test-key" });
        return (new KhayaSpeechProvider(http), fake);
    }

    private static HttpResponseMessage Audio() =>
        new(HttpStatusCode.OK) { Content = new ByteArrayContent([82, 73, 70, 70]) { Headers = { ContentType = new("audio/wav") } } };

    [Fact]
    public async Task Translates_then_speaks_with_the_key_header()
    {
        string? key = null;
        var (provider, fake) = Provider(request =>
        {
            key = request.Headers.GetValues("Ocp-Apim-Subscription-Key").Single();
            return request.RequestUri!.AbsolutePath.EndsWith("/v2/translate", StringComparison.Ordinal)
                ? new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("\"Me ho yɛ\"", Encoding.UTF8, "application/json") }
                : Audio();
        });
        var spoken = await provider.SpeakAsync("I am well", "tw", CancellationToken.None);
        Assert.NotNull(spoken);
        Assert.Equal("Me ho yɛ", spoken.Translated);
        Assert.Equal("audio/wav", spoken.ContentType);
        Assert.Equal("test-key", key);
        Assert.Equal(["/v2/translate", "/tts/v2/synthesize"], fake.Calls);
    }

    [Fact]
    public async Task Gives_nothing_for_unknown_languages_failures_or_non_audio()
    {
        var (unknown, _) = Provider(_ => Audio());
        Assert.Null(await unknown.SpeakAsync("Hello", "fr", CancellationToken.None));
        var (failing, _) = Provider(_ => new HttpResponseMessage(HttpStatusCode.Unauthorized));
        Assert.Null(await failing.SpeakAsync("Hello", "ee", CancellationToken.None));
        var (notAudio, _) = Provider(request => request.RequestUri!.AbsolutePath.EndsWith("translate", StringComparison.Ordinal)
            ? new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"translation\":\"Ndi\"}") }
            : new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"error\":\"quota\"}", Encoding.UTF8, "application/json") });
        Assert.Null(await notAudio.SpeakAsync("Hello", "dag", CancellationToken.None));
    }

    [Theory]
    [InlineData("\"Akwaaba\"", "Akwaaba")]
    [InlineData("{\"translation\":\"Woezɔ\"}", "Woezɔ")]
    [InlineData("{\"text\":\"Desiba\"}", "Desiba")]
    [InlineData("Plain text", "Plain text")]
    public void Reads_the_translation_in_any_shape(string body, string expected) =>
        Assert.Equal(expected, KhayaSpeechProvider.ReadText(body));
}

[IntegrationTest]
[Collection(DatabaseCollection.Name)]
public sealed class GetSpeechTests(PostgresFixture database) : IAsyncLifetime
{
    private readonly TestClock _clock = new();

    public Task InitializeAsync() => database.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    private sealed class CountingProvider(bool live) : ISpeechProvider
    {
        public int Calls { get; private set; }

        public bool IsLive => live;

        public Task<SpokenText?> SpeakAsync(string english, string language, CancellationToken cancellationToken)
        {
            Calls++;
            return Task.FromResult<SpokenText?>(new SpokenText("Me ho yɛ", "audio/wav", [1, 2, 3]));
        }
    }

    [Fact]
    public async Task Makes_each_sentence_once_and_keeps_it()
    {
        var provider = new CountingProvider(live: true);
        for (var i = 0; i < 2; i++)
        {
            await using var db = database.CreateContext();
            var result = await GetSpeech.Handle("tw", "  I am well ", new DefaultHttpContext(), db, provider, _clock, CancellationToken.None);
            Assert.NotNull(result);
        }

        Assert.Equal(1, provider.Calls);
        await using var check = database.CreateContext();
        var clip = Assert.Single(check.SpeechClips);
        Assert.Equal("Me ho yɛ", clip.Translated);
        Assert.Equal("I am well", clip.Text);
    }

    [Fact]
    public async Task Says_not_available_for_English_no_key_or_bad_text()
    {
        await using var db = database.CreateContext();
        var english = await Assert.ThrowsAsync<ApiException>(() =>
            GetSpeech.Handle("en", "Hello", new DefaultHttpContext(), db, new CountingProvider(true), _clock, CancellationToken.None));
        Assert.Equal("SPEECH_NOT_AVAILABLE", english.MessageKey);
        var noKey = await Assert.ThrowsAsync<ApiException>(() =>
            GetSpeech.Handle("tw", "Hello", new DefaultHttpContext(), db, new NoSpeechProvider(), _clock, CancellationToken.None));
        Assert.Equal("SPEECH_NOT_AVAILABLE", noKey.MessageKey);
        var tooLong = await Assert.ThrowsAsync<ApiException>(() =>
            GetSpeech.Handle("tw", new string('a', 501), new DefaultHttpContext(), db, new CountingProvider(true), _clock, CancellationToken.None));
        Assert.Equal("SPEECH_TEXT_INVALID", tooLong.MessageKey);
        Assert.Empty(db.SpeechClips);
    }
}

public sealed class SpeechServiceExtensionTests
{
    private static ISpeechProvider Resolve(string? key)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Khaya:ApiKey"] = key })
            .Build();
        var services = new ServiceCollection();
        services.AddSpeechService(configuration);
        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        return scope.ServiceProvider.GetRequiredService<ISpeechProvider>();
    }

    [Fact]
    public async Task Without_a_key_nothing_is_called()
    {
        var provider = Resolve(null);
        Assert.IsType<NoSpeechProvider>(provider);
        Assert.False(provider.IsLive);
        Assert.Null(await provider.SpeakAsync("Hello", "tw", CancellationToken.None));
    }

    [Fact]
    public void With_a_key_Khaya_answers() =>
        Assert.True(Assert.IsType<KhayaSpeechProvider>(Resolve("a-key")).IsLive);
}
