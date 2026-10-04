using System.Reflection;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Messages;
using AgroConnect.SharedLibrary.Providers.Implementations;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace AgroConnect.SharedLibrary;

public static class SharedLibraryExtension
{
    public static IServiceCollection AddSharedLibrary(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddSingleton<IClock, SystemClock>();
        services.AddScoped<ISessionProvider, SessionProvider>();
        services.AddSingleton<IMessageProvider, MessageProvider>();
        services.AddExceptionHandler<ApiExceptionHandler>();

        return services.AddMessages(typeof(SharedLibraryExtension).Assembly);
    }

    /// <summary>Adds the embedded Langs/*.json of an assembly. Every service calls this with its own assembly.</summary>
    public static IServiceCollection AddMessages(this IServiceCollection services, Assembly assembly)
        => services.AddSingleton<IMessageSource>(new AssemblyMessageSource(assembly));
}
