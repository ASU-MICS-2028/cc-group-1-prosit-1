using System.Net;
using System.Text;
using System.Text.Json;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using AgroConnect.SharedLibrary.Sms;
using AgroConnect.SharedLibrary.ValueObjects;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;

namespace AgroConnect.SharedLibrary.Tests;

/// <summary>Arkesel's side, faked: records the request and answers like Arkesel, or fails like a dropped network.</summary>
internal sealed class FakeArkesel(HttpStatusCode status, string json, bool unreachable = false) : HttpMessageHandler
{
    public HttpRequestMessage? Request { get; private set; }

    public JsonElement Body { get; private set; }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Request = request;
        Body = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken)).RootElement.Clone();
        if (unreachable)
        {
            throw new HttpRequestException("No route to host");
        }

        return new HttpResponseMessage(status) { Content = new StringContent(json, Encoding.UTF8, "application/json") };
    }
}

[UnitTest]
public sealed class SmsTests
{
    private const string Ok = """{"status":"success","data":[{"recipient":"233540000099","id":"9b75"}]}""";
    private static readonly PhoneNumber Team = PhoneNumber.Parse("+233540000099");
    private static readonly PhoneNumber Demo = PhoneNumber.Parse("024 000 0001");

    private static (ArkeselSmsSender Sender, FakeArkesel Arkesel) Create(
        SmsOptions settings, HttpStatusCode status = HttpStatusCode.OK, string json = Ok, bool unreachable = false)
    {
        var arkesel = new FakeArkesel(status, json, unreachable);
        var http = new HttpClient(arkesel);
        ArkeselSmsSender.Configure(http, settings);
        var notTexted = new LogOnlySmsSender(Substitute.For<IHostEnvironment>(), NullLogger<LogOnlySmsSender>.Instance);
        return (new ArkeselSmsSender(http, Options.Create(settings), notTexted, NullLogger<ArkeselSmsSender>.Instance), arkesel);
    }

    private static SmsOptions Settings(bool everyone = false) =>
        new() { ApiKey = "key", BaseUrl = "https://sms.arkesel.test", TextEveryone = everyone, OnlyTo = ["+233540000099"] };

    [Fact]
    public async Task Sends_through_arkesel_v2_with_the_key_header_and_the_approved_sender()
    {
        var (sender, arkesel) = Create(Settings());

        var result = await sender.SendAsync(Team, "Your AgroConnect code is 123456.", CancellationToken.None);

        Assert.Equal(new SmsResult(SmsOutcome.Sent), result);
        Assert.Equal(HttpMethod.Post, arkesel.Request!.Method);
        Assert.Equal("https://sms.arkesel.test/api/v2/sms/send", arkesel.Request.RequestUri!.ToString());
        Assert.Equal("key", arkesel.Request.Headers.GetValues("api-key").Single());
        Assert.Equal("AgroConnect", arkesel.Body.GetProperty("sender").GetString());
        Assert.Equal("Your AgroConnect code is 123456.", arkesel.Body.GetProperty("message").GetString());
        Assert.Equal("233540000099", arkesel.Body.GetProperty("recipients")[0].GetString());
        Assert.False(arkesel.Body.GetProperty("sandbox").GetBoolean());
    }

    [Fact]
    public async Task Never_texts_a_number_off_the_list_unless_told_to_text_everyone()
    {
        var (safe, unused) = Create(Settings());
        var (production, arkesel) = Create(Settings(everyone: true));

        Assert.Equal(SmsOutcome.Logged, (await safe.SendAsync(Demo, "code", CancellationToken.None)).Outcome);
        Assert.Null(unused.Request);
        Assert.Equal(SmsOutcome.Sent, (await production.SendAsync(Demo, "code", CancellationToken.None)).Outcome);
        Assert.Equal("233240000001", arkesel.Body.GetProperty("recipients")[0].GetString());
    }

    [Fact]
    public async Task A_refusal_is_failed_with_arkesels_reason()
    {
        var (sender, _) = Create(Settings(), HttpStatusCode.UnprocessableEntity, """{"status":"error","message":"Insufficient balance"}""");

        Assert.Equal(new SmsResult(SmsOutcome.Failed, "Insufficient balance"), await sender.SendAsync(Team, "x", CancellationToken.None));
    }

    [Fact]
    public async Task A_dropped_network_or_an_odd_answer_is_failed_not_a_crash()
    {
        var (down, _) = Create(Settings(), unreachable: true);
        var (odd, _) = Create(Settings(), HttpStatusCode.BadGateway, "<html>502</html>");

        Assert.Equal(new SmsResult(SmsOutcome.Failed, "Arkesel could not be reached: HttpRequestException"), await down.SendAsync(Team, "x", CancellationToken.None));
        Assert.Equal(new SmsResult(SmsOutcome.Failed, "Arkesel answered 502"), await odd.SendAsync(Team, "x", CancellationToken.None));
    }

    [Theory]
    [InlineData(true, """{"status":"success"}""", null)]
    [InlineData(true, """{"status":"error","message":"Invalid Sender ID"}""", "Invalid Sender ID")]
    [InlineData(false, """{"code":401}""", "Arkesel answered 401")]
    public void Reads_arkesels_answer(bool httpOk, string body, string? problem) =>
        Assert.Equal(problem, ArkeselSmsSender.Problem(httpOk, body, 401));

    [Theory]
    [InlineData("""{"status":"success","data":[{"recipient":"233540000099","id":"fa98b40c"}]}""", "fa98b40c")]
    [InlineData("""{"status":"success","data":[]}""", null)]
    [InlineData("""{"status":"success"}""", null)]
    [InlineData("not json", null)]
    public void Reads_arkesels_message_id_for_the_delivery_report(string body, string? id) =>
        Assert.Equal(id, ArkeselSmsSender.MessageId(body));

    [Theory]
    [InlineData("Development")]
    [InlineData("Production")]
    public async Task The_log_only_sender_never_texts_and_never_fails(string environmentName)
    {
        var environment = Substitute.For<IHostEnvironment>();
        environment.EnvironmentName.Returns(environmentName);
        var sender = new LogOnlySmsSender(environment, NullLogger<LogOnlySmsSender>.Instance);

        Assert.Equal(SmsOutcome.Logged, (await sender.SendAsync(Demo, "Your code is 123456", CancellationToken.None)).Outcome);
    }

    [Theory]
    [InlineData("", typeof(LogOnlySmsSender))]
    [InlineData("key", typeof(ArkeselSmsSender))]
    public void The_key_decides_between_arkesel_and_the_log(string key, Type expected)
    {
        var builder = WebApplication.CreateSlimBuilder();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?> { ["Sms:ApiKey"] = key });
        builder.Services.AddSms(builder.Configuration);
        using var app = builder.Build();

        Assert.IsType(expected, app.Services.GetRequiredService<ISmsSender>());
    }

    [Fact]
    public void A_sender_id_longer_than_11_letters_is_refused()
    {
        var builder = WebApplication.CreateSlimBuilder();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?> { ["Sms:SenderId"] = "AgroConnectGH" });
        builder.Services.AddSms(builder.Configuration);
        using var app = builder.Build();

        Assert.Throws<OptionsValidationException>(() => app.Services.GetRequiredService<IOptions<SmsOptions>>().Value);
    }
}
