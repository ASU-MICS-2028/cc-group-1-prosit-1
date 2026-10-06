using System.Reflection;

namespace AgroConnect.SharedLibrary.Helpers;

public static class BuildTime
{
    /// <summary>
    /// True while the build starts the app only to write the OpenAPI document. No secrets are set then,
    /// so start-up checks that need them are skipped; the real app still fails fast without them.
    /// </summary>
    public static bool IsOpenApiExport { get; } = Assembly.GetEntryAssembly()?.GetName().Name == "GetDocument.Insider";
}
