using System.Globalization;
using AgroConnect.Data.Entities;
using AgroConnect.Data.Persistence;
using AgroConnect.FarmerService.Providers.Interfaces;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Messages;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using AgroConnect.SharedLibrary.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace AgroConnect.UssdService.Features;

/// <summary>One answer to show on the phone; <see cref="Continue"/> false ends the session.</summary>
public sealed record UssdReply(string Message, bool Continue);

/// <summary>
/// The USSD menu (ADR 0038), the same for any gateway. A farmer dials the code and gets:
/// 1 Market prices (their crops first), 2 Weather with farm advice, 3 Ask my officer (a help request the
/// officer sees in Requests), 4 My officer's number, 0 Exit. The farmer is known by the number they dial
/// from; the place in the menu is kept in the database between key presses.
/// </summary>
public sealed class UssdMenu(
    AppDbContext db,
    IClock clock,
    IMessageProvider messages,
    IMarketPriceProvider prices,
    IWeatherProvider weather)
{
    /// <summary>Gateways end a session after about 2.5 minutes; anything older is cleared.</summary>
    public static readonly TimeSpan Forget = TimeSpan.FromMinutes(10);

    /// <summary>The longest text a phone shows on one USSD screen.</summary>
    public const int MaxLength = 182;

    public async Task<UssdReply> StepAsync(
        string sessionId, string msisdn, bool newSession, string? input, CancellationToken cancellationToken)
    {
        var now = clock.UtcNow;
        var session = newSession ? null : await db.UssdSessions.FindAsync([sessionId], cancellationToken);
        if (session is null)
        {
            return await StartAsync(sessionId, msisdn, now, cancellationToken);
        }

        var farmer = session.FarmerId is { } farmerId
            ? await db.Farmers.AsNoTracking().FirstOrDefaultAsync(f => f.Id == farmerId, cancellationToken)
            : null;
        if (farmer is null)
        {
            return await EndAsync(session, Text("USSD_NOT_REGISTERED", Language.English), cancellationToken);
        }

        var choice = (input ?? string.Empty).Trim();
        var reply = session.Screen switch
        {
            "prices" => await OnPricesAsync(session, farmer, choice, cancellationToken),
            "ask" => await OnAskAsync(session, farmer, choice, now, cancellationToken),
            _ => await OnMainAsync(session, farmer, choice, cancellationToken),
        };

        if (reply.Continue)
        {
            session.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            return reply;
        }

        return await EndAsync(session, reply.Message, cancellationToken);
    }

    private async Task<UssdReply> StartAsync(string sessionId, string msisdn, DateTimeOffset now, CancellationToken cancellationToken)
    {
        await db.UssdSessions.Where(u => u.UpdatedAt < now - Forget).ExecuteDeleteAsync(cancellationToken);

        Farmer? farmer = null;
        if (PhoneNumber.TryParse(msisdn, out var phone))
        {
            // Family members can share a phone: the first person registered on it, as for sign-in.
            farmer = await db.Farmers.AsNoTracking()
                .Where(f => f.PhoneE164 == phone.E164)
                .OrderBy(f => f.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);
        }

        if (farmer is null)
        {
            return new UssdReply(Text("USSD_NOT_REGISTERED", Language.English), false);
        }

        var existing = await db.UssdSessions.FindAsync([sessionId], cancellationToken);
        if (existing is not null)
        {
            db.UssdSessions.Remove(existing);
        }

        db.UssdSessions.Add(new UssdSession
        {
            SessionId = sessionId,
            PhoneE164 = phone.E164,
            FarmerId = farmer.Id,
            Screen = "main",
            CreatedAt = now,
            UpdatedAt = now,
        });
        await db.SaveChangesAsync(cancellationToken);
        return new UssdReply(Main(farmer), true);
    }

    private async Task<UssdReply> OnMainAsync(UssdSession session, Farmer farmer, string choice, CancellationToken cancellationToken)
    {
        switch (choice)
        {
            case "1":
                return await ShowPricesAsync(session, farmer, cancellationToken);
            case "2":
                return new UssdReply(await WeatherAsync(farmer, cancellationToken), false);
            case "3":
                session.Screen = "ask";
                return new UssdReply(Text("USSD_ASK", farmer.Language), true);
            case "4":
                return new UssdReply(await OfficerAsync(farmer, cancellationToken), false);
            case "0":
                return new UssdReply(Text("USSD_BYE", farmer.Language), false);
            default:
                session.Screen = "main";
                return new UssdReply(Again(Main(farmer), farmer.Language), true);
        }
    }

    private async Task<UssdReply> ShowPricesAsync(UssdSession session, Farmer farmer, CancellationToken cancellationToken)
    {
        var all = await prices.GetPricesAsync(farmer.RegionDistrict, farmer.Crops, cancellationToken);
        var crops = all.Prices.Take(6).Select(p => p.Crop).ToList();
        session.Screen = "prices";
        session.Data = string.Join(',', crops);
        return new UssdReply(PriceList(crops, farmer.Language), true);
    }

    private async Task<UssdReply> OnPricesAsync(UssdSession session, Farmer farmer, string choice, CancellationToken cancellationToken)
    {
        var crops = (session.Data ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(name => Enum.Parse<Crop>(name))
            .ToList();
        if (choice == "0")
        {
            session.Screen = "main";
            return new UssdReply(Main(farmer), true);
        }

        if (!int.TryParse(choice, CultureInfo.InvariantCulture, out var number) || number < 1 || number > crops.Count)
        {
            return new UssdReply(Again(PriceList(crops, farmer.Language), farmer.Language), true);
        }

        var crop = crops[number - 1];
        var all = await prices.GetPricesAsync(farmer.RegionDistrict, farmer.Crops, cancellationToken);
        var price = all.Prices.First(p => p.Crop == crop);
        var markets = string.Join(", ", price.Markets.Select(m => $"{m.Market} {m.PricePerKg.ToString("0.00", CultureInfo.InvariantCulture)}"));
        var change = price.WeekChangePercent switch
        {
            > 0 => $"+{price.WeekChangePercent.ToString("0", CultureInfo.InvariantCulture)}%",
            < 0 => $"{price.WeekChangePercent.ToString("0", CultureInfo.InvariantCulture)}%",
            _ => Text("USSD_NO_CHANGE", farmer.Language),
        };
        return new UssdReply(Text("USSD_PRICE", farmer.Language, CropName(crop, farmer.Language), markets, change), false);
    }

    private async Task<UssdReply> OnAskAsync(UssdSession session, Farmer farmer, string choice, DateTimeOffset now, CancellationToken cancellationToken)
    {
        HelpCategory? category = choice switch
        {
            "1" => HelpCategory.Crops,
            "2" => HelpCategory.Money,
            "3" => HelpCategory.MyDetails,
            "4" => HelpCategory.Other,
            _ => null,
        };
        if (choice == "0")
        {
            session.Screen = "main";
            return new UssdReply(Main(farmer), true);
        }

        if (category is null)
        {
            return new UssdReply(Again(Text("USSD_ASK", farmer.Language), farmer.Language), true);
        }

        // The same request the app sends: it appears in the officer's Requests and the admin's Help desk.
        db.HelpRequests.Add(new HelpRequest
        {
            Id = Guid.CreateVersion7(now),
            FarmerId = farmer.Id,
            OfficerId = farmer.RegisteredById,
            Category = category.Value,
            Text = Text("USSD_ASK_TEXT", Language.English),
            Status = HelpStatus.Waiting,
            CreatedAt = now,
            UpdatedAt = now,
        });
        var officer = await db.Users.AsNoTracking()
            .Where(u => u.Id == farmer.RegisteredById)
            .Select(u => u.FullName)
            .FirstOrDefaultAsync(cancellationToken);
        return new UssdReply(Text("USSD_ASK_SENT", farmer.Language, officer ?? "your officer"), false);
    }

    private async Task<string> WeatherAsync(Farmer farmer, CancellationToken cancellationToken)
    {
        var place = string.IsNullOrWhiteSpace(farmer.Community) ? farmer.RegionDistrict ?? "Northern Region" : farmer.Community;
        var forecast = await weather.GetForecastAsync(place, farmer.Latitude, farmer.Longitude, cancellationToken);
        var today = forecast.Today;
        return Text(
            "USSD_WEATHER",
            farmer.Language,
            forecast.Place,
            Text($"USSD_SKY_{today.Condition}", farmer.Language),
            today.MaxC,
            today.RainChancePercent,
            Text($"USSD_ADVICE_{forecast.Advice}", farmer.Language));
    }

    private async Task<string> OfficerAsync(Farmer farmer, CancellationToken cancellationToken)
    {
        var officer = await db.Users.AsNoTracking()
            .Where(u => u.Id == farmer.RegisteredById)
            .Select(u => new { u.FullName, u.PhoneE164 })
            .FirstOrDefaultAsync(cancellationToken);
        return officer is null
            ? Text("USSD_NO_OFFICER", farmer.Language)
            : Text("USSD_OFFICER", farmer.Language, officer.FullName, LocalNumber(officer.PhoneE164));
    }

    private async Task<UssdReply> EndAsync(UssdSession session, string message, CancellationToken cancellationToken)
    {
        db.UssdSessions.Remove(session);
        await db.SaveChangesAsync(cancellationToken);
        return new UssdReply(message, false);
    }

    private string Main(Farmer farmer) => Text("USSD_MAIN", farmer.Language, farmer.FullName.Split(' ')[0]);

    private string PriceList(IReadOnlyList<Crop> crops, Language language) =>
        Text("USSD_PRICES", language, string.Join('\n', crops.Select((c, i) => $"{i + 1} {CropName(c, language)}")));

    private string Again(string screen, Language language) => Fit($"{Text("USSD_CHOOSE", language)}\n{screen}");

    private string CropName(Crop crop, Language language) => Text($"USSD_CROP_{crop}", language);

    private string Text(string key, Language language, params object[] args) => Fit(messages.Get(key, language, args));

    /// <summary>"+233240000001" as people write it: "024 000 0001".</summary>
    public static string LocalNumber(string e164)
    {
        var local = "0" + e164[4..];
        return local.Length == 10 ? $"{local[..3]} {local[3..6]} {local[6..]}" : local;
    }

    /// <summary>Never longer than one USSD screen.</summary>
    public static string Fit(string text) => text.Length <= MaxLength ? text : text[..(MaxLength - 3)] + "...";
}
