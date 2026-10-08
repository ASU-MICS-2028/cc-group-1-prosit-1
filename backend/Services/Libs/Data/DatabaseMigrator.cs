using AgroConnect.Data.Entities;
using AgroConnect.Data.Persistence;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using AgroConnect.SharedLibrary.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AgroConnect.Data;

/// <summary>
/// Brings the database up to date when the API starts, then adds the configured demo accounts.
/// Runs in the background and retries, because in Docker the database may start after the API.
/// </summary>
public sealed partial class DatabaseMigrator(
    IServiceScopeFactory scopes,
    IOptions<DatabaseOptions> database,
    IOptions<SeedOptions> seed,
    ILogger<DatabaseMigrator> logger) : BackgroundService
{
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!database.Value.MigrateOnStartup)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var clock = scope.ServiceProvider.GetRequiredService<IClock>();
                await db.Database.MigrateAsync(stoppingToken);
                await SeedAsync(db, clock.UtcNow, stoppingToken);
                LogReady(logger);
                return;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                LogRetry(logger, exception, RetryDelay.TotalSeconds);
                try
                {
                    await Task.Delay(RetryDelay, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    return;
                }
            }
        }
    }

    private async Task SeedAsync(AppDbContext db, DateTimeOffset now, CancellationToken cancellationToken)
    {
        AppUser? firstOfficer = null;
        foreach (var officer in seed.Value.Officers)
        {
            // Every officer is added; the first one registers the sample farmer.
            var added = await SeedUserAsync(db, officer, UserRole.Officer, now, cancellationToken);
            firstOfficer ??= added;
        }

        foreach (var admin in seed.Value.Admins)
        {
            await SeedUserAsync(db, admin, UserRole.Admin, now, cancellationToken);
        }

        // The accounts first, so a farmer can name the officer who registered them; then all farmers in one save.
        await db.SaveChangesAsync(cancellationToken);

        if (seed.Value.SampleFarmer && firstOfficer is not null && !await db.Farmers.AnyAsync(cancellationToken))
        {
            db.Farmers.Add(SampleFarmer(firstOfficer.Id, now));
        }

        foreach (var farmer in seed.Value.Farmers)
        {
            await SeedFarmerAsync(db, farmer, firstOfficer, now, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Adds the farmer unless one with this phone is there. Skipped without a valid phone or a registering officer.</summary>
    private static async Task SeedFarmerAsync(
        AppDbContext db, SeedFarmer person, AppUser? firstOfficer, DateTimeOffset now, CancellationToken cancellationToken)
    {
        if (!PhoneNumber.TryParse(person.Phone, out var phone)
            || db.Farmers.Local.Any(f => f.PhoneE164 == phone.E164)
            || await db.Farmers.AnyAsync(f => f.PhoneE164 == phone.E164, cancellationToken))
        {
            return;
        }

        var officer = PhoneNumber.TryParse(person.OfficerPhone, out var officerPhone)
            ? await db.Users.FirstOrDefaultAsync(u => u.PhoneE164 == officerPhone.E164 && u.Role == UserRole.Officer, cancellationToken)
            : firstOfficer;
        if (officer is null)
        {
            return;
        }

        db.Farmers.Add(new Farmer
        {
            Id = Guid.CreateVersion7(now),
            RegisteredById = officer.Id,
            ConsentGiven = true,
            ConsentAt = now,
            Language = person.Language,
            FullName = person.FullName,
            PhoneE164 = phone.E164,
            Community = person.Community,
            RegionDistrict = person.RegionDistrict ?? (officer.District is null ? officer.Region : $"{officer.Region} · {officer.District}"),
            Crops = person.Crops,
            ClientUpdatedAt = now,
            ServerUpdatedAt = now,
            CreatedAt = now,
        });
    }

    // Sample data only (see the design's "sample data" note): not a real person.
    /// <summary>Adds the account unless it is already there. A phone number that is not Ghanaian is skipped (null).</summary>
    private static async Task<AppUser?> SeedUserAsync(
        AppDbContext db, SeedOfficer person, UserRole role, DateTimeOffset now, CancellationToken cancellationToken)
    {
        if (!PhoneNumber.TryParse(person.Phone, out var phone))
        {
            return null;
        }

        var existing = await db.Users.SingleOrDefaultAsync(u => u.PhoneE164 == phone.E164 && u.Role == role, cancellationToken);
        if (existing is not null)
        {
            return existing;
        }

        var user = new AppUser
        {
            Id = Guid.CreateVersion7(now),
            Role = role,
            PhoneE164 = phone.E164,
            FullName = person.FullName,
            Region = person.Region,
            District = person.District,
            CreatedAt = now,
        };
        db.Users.Add(user);
        return user;
    }

    private static Farmer SampleFarmer(Guid officerId, DateTimeOffset now) => new()
    {
        Id = Guid.Parse("0192f0a0-0000-7000-8000-000000000001"),
        RegisteredById = officerId,
        ConsentGiven = true,
        ConsentAt = now,
        Language = Language.Twi,
        FullName = "Ama Boateng",
        PhoneE164 = "+233240001234",
        Gender = Gender.Female,
        AgeBand = AgeBand.From36To50,
        Community = "Tolon",
        RegionDistrict = "Northern · Tolon District",
        Crops = [Crop.Maize, Crop.Groundnut],
        FarmSize = 2.5m,
        FarmSizeUnit = AreaUnit.Acres,
        Soil = SoilType.Loamy,
        PlantingSeasons = [PlantingSeason.Rainy],
        PhoneType = PhoneType.BasicPhone,
        DataPurchase = DataPurchase.None,
        ReachChannels = [ContactChannel.Sms],
        IncomeSources = [IncomeSource.Crops, IncomeSource.Trading],
        HasBankAccount = false,
        MobileMoney = MobileMoneyUse.Yes,
        LastAgentVisit = LastAgentVisit.LastYear,
        HelpNeeded = [HelpNeed.Seeds, HelpNeed.MarketPrices],
        ClientUpdatedAt = now,
        ServerUpdatedAt = now,
        CreatedAt = now,
    };

    [LoggerMessage(Level = LogLevel.Information, Message = "Database is up to date")]
    private static partial void LogReady(ILogger logger);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Database not ready yet, retrying in {Seconds} s")]
    private static partial void LogRetry(ILogger logger, Exception exception, double seconds);
}
