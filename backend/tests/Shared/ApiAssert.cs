using AgroConnect.SharedLibrary.Errors;
using Xunit;

namespace AgroConnect.Tests.Shared;

public static class ApiAssert
{
    /// <summary>Asserts a feature reported the expected failure (status code and message key).</summary>
    public static async Task<ApiException> FailsAsync(int statusCode, string messageKey, Func<Task> action)
    {
        var exception = await Assert.ThrowsAsync<ApiException>(action);
        Assert.Equal(statusCode, exception.StatusCode);
        Assert.Equal(messageKey, exception.MessageKey);
        return exception;
    }
}
