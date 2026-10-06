using AgroConnect.SharedLibrary.Providers.Interfaces;

namespace AgroConnect.Tests.Shared;

/// <summary>A clock the test moves by hand. Starts at a fixed time so results do not depend on when tests run.</summary>
public sealed class TestClock : IClock
{
    public DateTimeOffset UtcNow { get; set; } = new(2026, 10, 1, 9, 0, 0, TimeSpan.Zero);

    public void Advance(TimeSpan by) => UtcNow += by;
}
