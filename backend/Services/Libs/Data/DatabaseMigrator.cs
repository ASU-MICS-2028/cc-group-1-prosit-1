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

        if (seed.Value.SampleFarmer && firstOfficer is not null && !await db.Farmers.AnyAsync(cancellationToken))
        {
            db.Farmers.Add(SampleFarmer(firstOfficer.Id, now));
        }

        await db.SaveChangesAsync(cancellationToken);

        // The sample farmer's cooperative (ADR 0037), so its screens have something real to show.
        if (seed.Value.SampleFarmer && firstOfficer is not null
            && await db.Farmers.AnyAsync(f => f.Id == SampleFarmerId, cancellationToken)
            && !await db.Cooperatives.AnyAsync(cancellationToken))
        {
            SeedCooperative(db, firstOfficer, now);
            await db.SaveChangesAsync(cancellationToken);
        }
    }

    private static readonly Guid SampleFarmerId = Guid.Parse("0192f0a0-0000-7000-8000-000000000001");

    // Sample data only: a cooperative for the sample farmer with an open order, a sale and a meeting.
    private static void SeedCooperative(AppDbContext db, AppUser officer, DateTimeOffset now)
    {
        var cooperativeId = Guid.CreateVersion7(now);
        db.Cooperatives.Add(new Cooperative
        {
            Id = cooperativeId,
            Name = "Tolon Farmers Cooperative",
            Community = "Tolon",
            Region = officer.Region ?? "Northern",
            District = officer.District ?? "Tolon",
            LeaderFarmerId = SampleFarmerId,
            CreatedById = officer.Id,
            CreatedAt = now,
        });
        db.CooperativeMembers.Add(new CooperativeMember { CooperativeId = cooperativeId, FarmerId = SampleFarmerId, JoinedAt = now });
        db.GroupOrders.Add(new GroupOrder
        {
            Id = Guid.CreateVersion7(now),
            CooperativeId = cooperativeId,
            Product = "NPK fertiliser 15-15-15",
            Dealer = "Tolon Agro Inputs",
            UnitPricePesewas = 15_000,
            AlonePricePesewas = 17_000,
            TargetBags = 120,
            ClosesOn = DateOnly.FromDateTime(now.UtcDateTime).AddDays(10),
            Status = GroupOrderStatus.Open,
        });
        db.GroupSales.Add(new GroupSale
        {
            Id = Guid.CreateVersion7(now),
            CooperativeId = cooperativeId,
            Crop = "Maize",
            Buyer = "Savelugu Grain Traders",
            PricePerKgPesewas = 680,
            MarketPricePerKgPesewas = 645,
            TargetKg = 20_000,
            Status = GroupSaleStatus.Open,
        });
        var daysToSaturday = ((int)DayOfWeek.Saturday - (int)now.DayOfWeek + 7) % 7;
        db.Meetings.Add(new Meeting
        {
            Id = Guid.CreateVersion7(now),
            CooperativeId = cooperativeId,
            StartsAt = new DateTimeOffset(now.UtcDateTime.Date.AddDays(daysToSaturday == 0 ? 7 : daysToSaturday).AddHours(10), TimeSpan.Zero),
            Place = "Tolon community centre",
            Topic = "Selling maize together",
            Bring = "How many bags you can sell",
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
        Id = SampleFarmerId,
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
