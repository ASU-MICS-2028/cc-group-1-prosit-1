using AgroConnect.Data.Entities;
using AgroConnect.Data.Persistence;
using AgroConnect.SharedLibrary.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AgroConnect.Api.Tests;

/// <summary>The migrated database itself protects the data: links must point at real rows, names are snake_case.</summary>
[IntegrationTest]
[Collection(SeededApiCollection.Name)]
public sealed class DatabaseSchemaTests(SeededApiFixture api)
{
    [Fact]
    public async Task A_visit_for_a_farmer_that_does_not_exist_is_refused()
    {
        await using var scope = api.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var officer = await db.Users.FirstAsync(u => u.Role == UserRole.Officer);
        var now = DateTimeOffset.UtcNow;
        db.Visits.Add(new Visit
        {
            Id = Guid.CreateVersion7(),
            FarmerId = Guid.CreateVersion7(), // no such farmer
            OfficerId = officer.Id,
            ScheduledFor = DateOnly.FromDateTime(now.UtcDateTime),
            ClientUpdatedAt = now,
            ServerUpdatedAt = now,
            CreatedAt = now,
        });

        var error = await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());

        Assert.Contains("fk_visits_farmers_farmer_id", error.InnerException?.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Columns_use_snake_case_so_sql_needs_no_quotes()
    {
        await using var scope = api.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var names = await db.Database
            .SqlQueryRaw<string>("select full_name as \"Value\" from farmers where phone_e164 = '+233240001234'")
            .ToListAsync();

        Assert.Equal(["Ama Boateng"], names);
    }
}
