using AgroConnect.SharedLibrary.Providers.Interfaces;

namespace AgroConnect.SharedLibrary.Providers.Implementations;

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
