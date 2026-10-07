using System.Text.Json;
using System.Text.Json.Serialization;
using AgroConnect.Data.Persistence;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.SharedLibrary.Messages;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using AgroConnect.SharedLibrary.Security;
using AgroConnect.SyncService.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AgroConnect.SyncService.Features;

/// <summary>
/// POST /api/sync: an officer's phone sends what it saved offline and gets one answer per record (ADR 0029, 0032).
/// <list type="bullet">
/// <item>Each record is read on its own, so one record the server cannot read (an old app, a new option) never blocks the rest.</item>
/// <item>The newest change wins, by the time it was made on the phone.</item>
/// <item>The officer comes from the sign-in, never from the record: an officer can only add and change their own.</item>
/// <item>A visit whose farmer is not on the server yet gets no answer, so it stays queued and goes with the next sync.</item>
/// </list>
/// </summary>
public sealed class SyncRecords : IFeature
{
    /// <summary>More than this per kind in one call is left unanswered: it stays queued and goes next time.</summary>
    public const int MaxRecordsPerKind = 500;

    /// <summary>Strict reading: option names only ("maize", not 0), so a value the server does not know is a clear "invalid".</summary>
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(allowIntegerValues: false) },
        NumberHandling = JsonNumberHandling.Strict,
    };

    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/sync", Handle)
            .WithName("SyncRecords")
            .WithTags("Sync")
            .RequireAuthorization(AuthPolicies.Officer)
            .Accepts<SyncRequest>("application/json")
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden);

    public static async Task<Ok<SyncResponse>> Handle(
        HttpRequest request,
        AppDbContext db,
        ISessionProvider session,
        IClock clock,
        IMessageProvider messages,
        ILogger<SyncRecords> logger,
        CancellationToken cancellationToken)
    {
        var batch = await ReadBatchAsync(request.Body, cancellationToken);
        var officerId = session.RequireUserId();
        var now = clock.UtcNow;
        var results = new List<SyncResult>();
        string Text(string key) => messages.Get(key, session.Language);

        // Farmers first: a visit in the same batch can then find its farmer.
        var farmers = Incoming<SyncFarmer>(batch.Farmers, f => f.ClientUpdatedAt, logger);
        var farmerIds = farmers.Select(f => f.Id).ToList();
        var storedFarmers = await db.Farmers.Where(f => farmerIds.Contains(f.Id)).ToDictionaryAsync(f => f.Id, cancellationToken);
        var createdFarmers = new HashSet<Guid>();
        foreach (var (id, record) in farmers)
        {
            storedFarmers.TryGetValue(id, out var stored);
            if (record is null)
            {
                results.Add(new SyncResult(id, SyncOutcome.Invalid, Text("RECORD_UNREADABLE")));
            }
            else if (stored is not null && stored.RegisteredById != officerId)
            {
                results.Add(new SyncResult(id, SyncOutcome.Forbidden, Text("NOT_YOUR_FARMER")));
            }
            else if (stored is not null && stored.ClientUpdatedAt >= SyncMapping.NotAfter(record.ClientUpdatedAt, now))
            {
                results.Add(new SyncResult(id, SyncOutcome.Unchanged));
            }
            else if (SyncRules.CheckFarmer(record) is { } problem)
            {
                results.Add(new SyncResult(id, SyncOutcome.Invalid, Text(problem)));
            }
            else if (stored is null)
            {
                db.Farmers.Add(SyncMapping.NewFarmer(record, officerId, now));
                createdFarmers.Add(id);
                results.Add(new SyncResult(id, SyncOutcome.Created));
            }
            else
            {
                SyncMapping.Apply(stored, record, now);
                results.Add(new SyncResult(id, SyncOutcome.Updated));
            }
        }

        var visits = Incoming<SyncVisit>(batch.Visits, v => v.ClientUpdatedAt, logger);
        var visitIds = visits.Select(v => v.Id).ToList();
        var storedVisits = await db.Visits.Where(v => visitIds.Contains(v.Id)).ToDictionaryAsync(v => v.Id, cancellationToken);
        // Who registered each visited farmer: those on the server, plus those created just now.
        var visitedIds = visits.Where(v => v.Record is not null).Select(v => v.Record!.FarmerId).Distinct().ToList();
        var owners = await db.Farmers.AsNoTracking()
            .Where(f => visitedIds.Contains(f.Id))
            .ToDictionaryAsync(f => f.Id, f => f.RegisteredById, cancellationToken);
        foreach (var id in createdFarmers)
        {
            owners[id] = officerId;
        }

        foreach (var (id, record) in visits)
        {
            storedVisits.TryGetValue(id, out var stored);
            if (record is null)
            {
                results.Add(new SyncResult(id, SyncOutcome.Invalid, Text("RECORD_UNREADABLE")));
            }
            else if (!owners.TryGetValue(record.FarmerId, out var farmerOwner))
            {
                // The farmer is not on the server yet (refused, or not sent): no answer, so the visit stays queued.
                continue;
            }
            else if (farmerOwner != officerId)
            {
                results.Add(new SyncResult(id, SyncOutcome.Forbidden, Text("NOT_YOUR_FARMER")));
            }
            else if (stored is not null && stored.OfficerId != officerId)
            {
                results.Add(new SyncResult(id, SyncOutcome.Forbidden, Text("NOT_YOUR_VISIT")));
            }
            else if (stored is not null && stored.ClientUpdatedAt >= SyncMapping.NotAfter(record.ClientUpdatedAt, now))
            {
                results.Add(new SyncResult(id, SyncOutcome.Unchanged));
            }
            else if (SyncRules.CheckVisit(record) is { } problem)
            {
                results.Add(new SyncResult(id, SyncOutcome.Invalid, Text(problem)));
            }
            else if (stored is null)
            {
                db.Visits.Add(SyncMapping.NewVisit(record, officerId, now));
                results.Add(new SyncResult(id, SyncOutcome.Created));
            }
            else
            {
                SyncMapping.Apply(stored, record, now);
                results.Add(new SyncResult(id, SyncOutcome.Updated));
            }
        }

        // One save, one transaction: either the whole batch is stored or none of it (the phone keeps it and retries).
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Sync from officer {OfficerId}: {Farmers} farmers, {Visits} visits; {Outcomes}",
            officerId,
            farmers.Count,
            visits.Count,
            string.Join(", ", results.GroupBy(r => r.Outcome).Select(g => $"{g.Key} {g.Count()}")));

        return TypedResults.Ok(new SyncResponse(results));
    }

    /// <summary>The two lists, each record still unread. A body that is not a batch at all is a 400.</summary>
    internal static async Task<RawBatch> ReadBatchAsync(Stream body, CancellationToken cancellationToken)
    {
        try
        {
            return await JsonSerializer.DeserializeAsync<RawBatch>(body, Json, cancellationToken)
                ?? throw new ApiException(StatusCodes.Status400BadRequest, "SYNC_BODY_INVALID");
        }
        catch (JsonException)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "SYNC_BODY_INVALID");
        }
    }

    /// <summary>
    /// Reads each record on its own. A record with no readable id cannot be answered and is skipped (logged).
    /// When the same id comes twice, the newest change is kept.
    /// </summary>
    internal static List<(Guid Id, T? Record)> Incoming<T>(
        IReadOnlyList<JsonElement>? elements, Func<T, DateTimeOffset> changedAt, ILogger logger)
        where T : class
    {
        var read = new List<(Guid Id, T? Record)>();
        foreach (var element in (elements ?? []).Take(MaxRecordsPerKind))
        {
            if (element.ValueKind != JsonValueKind.Object
                || !element.TryGetProperty("id", out var idProperty)
                || idProperty.ValueKind != JsonValueKind.String
                || !idProperty.TryGetGuid(out var id)
                || id == Guid.Empty)
            {
                logger.LogWarning("Sync skipped a {Kind} record with no readable id", typeof(T).Name);
                continue;
            }

            T? record;
            try
            {
                record = element.Deserialize<T>(Json);
            }
            catch (JsonException)
            {
                record = null;
            }

            read.Add((id, record));
        }

        return read
            .GroupBy(r => r.Id)
            .Select(same => same.OrderByDescending(r => r.Record is null ? DateTimeOffset.MinValue : changedAt(r.Record)).First())
            .ToList();
    }

    internal sealed record RawBatch(IReadOnlyList<JsonElement>? Farmers, IReadOnlyList<JsonElement>? Visits);
}
