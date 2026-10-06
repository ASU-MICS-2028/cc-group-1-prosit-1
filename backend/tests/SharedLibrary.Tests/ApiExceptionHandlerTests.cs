using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Messages;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;

namespace AgroConnect.SharedLibrary.Tests;

[UnitTest]
public class ApiExceptionHandlerTests
{
    private readonly IMessageProvider _messages = Substitute.For<IMessageProvider>();
    private readonly ISessionProvider _session = Substitute.For<ISessionProvider>();
    private readonly IProblemDetailsService _problemDetails = Substitute.For<IProblemDetailsService>();
    private readonly ApiExceptionHandler _handler;

    public ApiExceptionHandlerTests()
    {
        _problemDetails.TryWriteAsync(Arg.Any<ProblemDetailsContext>()).Returns(true);
        _handler = new ApiExceptionHandler(_messages, _problemDetails);
    }

    [Fact]
    public async Task Writes_problem_details_in_the_callers_language()
    {
        _session.Language.Returns(Language.Twi);
        _messages.Get("NOT_FOUND", Language.Twi, Arg.Any<object[]>()).Returns("Not found (in Twi)");
        var context = new DefaultHttpContext { RequestServices = new ServiceCollection().AddSingleton(_session).BuildServiceProvider() };

        var handled = await _handler.TryHandleAsync(context, new ApiException(404, "NOT_FOUND"), CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(404, context.Response.StatusCode);
        await _problemDetails.Received(1).TryWriteAsync(Arg.Is<ProblemDetailsContext>(c =>
            c.ProblemDetails.Status == 404
            && c.ProblemDetails.Title == "NOT_FOUND"
            && c.ProblemDetails.Detail == "Not found (in Twi)"));
    }

    [Fact]
    public async Task Ignores_exceptions_that_are_not_api_exceptions()
    {
        var handled = await _handler.TryHandleAsync(new DefaultHttpContext(), new InvalidOperationException("boom"), CancellationToken.None);

        Assert.False(handled);
        await _problemDetails.DidNotReceive().TryWriteAsync(Arg.Any<ProblemDetailsContext>());
    }

    [Fact]
    public async Task The_shared_assert_helper_checks_status_and_key()
    {
        var thrown = await ApiAssert.FailsAsync(403, "FORBIDDEN", () => throw new ApiException(403, "FORBIDDEN"));

        Assert.Equal("FORBIDDEN", thrown.Message);
    }
}
