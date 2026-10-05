namespace AgroConnect.SharedLibrary.Providers.Interfaces;

/// <summary>
/// The current time, behind an interface so rules that depend on it (such as the
/// "newest change wins" sync rule and clamping future timestamps) can be tested.
/// </summary>
public interface IClock
{
    DateTimeOffset UtcNow { get; }
}
