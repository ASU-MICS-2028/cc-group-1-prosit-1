using AgroConnect.CooperativeService.Models;
using AgroConnect.Data.Entities;
using AgroConnect.Data.Persistence;
using AgroConnect.MoneyService.Features;
using AgroConnect.MoneyService.Models;
using AgroConnect.MoneyService.Providers;
using AgroConnect.SharedLibrary.Enums;
using AgroConnect.SharedLibrary.Errors;
using AgroConnect.SharedLibrary.Features;
using AgroConnect.SharedLibrary.Providers.Interfaces;
using AgroConnect.SharedLibrary.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AgroConnect.CooperativeService.Features;

/// <summary>Who may do what with a cooperative, and the shared reads (ADR 0040).</summary>
internal static class Coop
{
    public const int MaxBags = 500;

    public static RouteHandlerBuilder Describe(this RouteHandlerBuilder route, string name, string policy) =>
        route.WithName(name)
            .WithTags("Cooperatives")
            .RequireAuthorization(policy)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

    /// <summary>The signed-in farmer and their cooperative (a farmer is in one at most).</summary>
    public static async Task<(Farmer Farmer, Cooperative Cooperative)> FarmerCooperativeAsync(
        AppDbContext db, ISessionProvider session, CancellationToken ct)
    {
        var farmerId = session.FarmerId ?? throw new ApiException(StatusCodes.Status403Forbidden, "NOT_A_FARMER_ACCOUNT");
        var farmer = await db.Farmers.AsNoTracking().SingleOrDefaultAsync(f => f.Id == farmerId, ct)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "FARMER_NOT_FOUND");
        var cooperative = await (
                from member in db.CooperativeMembers.AsNoTracking()
                join coop in db.Cooperatives.AsNoTracking() on member.CooperativeId equals coop.Id
                where member.FarmerId == farmerId
                select coop)
            .SingleOrDefaultAsync(ct)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "NOT_IN_A_COOPERATIVE");
        return (farmer, cooperative);
    }

    public static async Task<AppUser> UserAsync(AppDbContext db, ISessionProvider session, UserRole role, CancellationToken ct)
    {
        var userId = session.RequireUserId();
        return await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId && u.Role == role, ct)
            ?? throw new ApiException(
                StatusCodes.Status403Forbidden,
                role == UserRole.Admin ? "NOT_AN_ADMIN_ACCOUNT" : "NOT_AN_OFFICER_ACCOUNT");
    }

    /// <summary>A cooperative the signed-in officer created.</summary>
    public static async Task<Cooperative> OwnedAsync(Guid id, AppDbContext db, ISessionProvider session, CancellationToken ct)
    {
        var officer = await UserAsync(db, session, UserRole.Officer, ct);
        return await db.Cooperatives.SingleOrDefaultAsync(c => c.Id == id && c.CreatedById == officer.Id, ct)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "COOPERATIVE_NOT_FOUND");
    }

    /// <summary>A payment description fits in 100 characters.</summary>
    public static string Describe(string text) => text.Length > 100 ? text[..100] : text;

    public static long Pesewas(decimal amount) => (long)Math.Round(amount * 100m, MidpointRounding.AwayFromZero);

    public static bool Valid(string? value, int maximum = 150) =>
        !string.IsNullOrWhiteSpace(value) && value.Trim().Length <= maximum;

    /// <summary>
    /// Savings count only once their mobile money payment is paid. The payment is settled by MoneyService
    /// (the app checks it every few seconds); this copies the result onto waiting contributions.
    /// </summary>
    public static async Task SettleSavingsAsync(AppDbContext db, Guid cooperativeId, CancellationToken ct)
    {
        var waiting = await db.SavingsContributions
            .Where(c => c.CooperativeId == cooperativeId && c.Status == SavingsContributionStatus.Waiting)
            .ToListAsync(ct);
        if (waiting.Count == 0)
        {
            return;
        }

        var ids = waiting.Select(c => c.PaymentId).ToList();
        var payments = await db.Payments.AsNoTracking().Where(p => ids.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.Status, ct);
        foreach (var contribution in waiting)
        {
            contribution.Status = payments.GetValueOrDefault(contribution.PaymentId) switch
            {
                PaymentStatus.Paid => SavingsContributionStatus.Paid,
                PaymentStatus.Failed => SavingsContributionStatus.Failed,
                _ => SavingsContributionStatus.Waiting,
            };
        }

        await db.SaveChangesAsync(ct);
    }

    public static async Task<CooperativeDetails> DetailsAsync(
        AppDbContext db, Cooperative cooperative, Guid? farmerId, DateTimeOffset now, CancellationToken ct)
    {
        await SettleSavingsAsync(db, cooperative.Id, ct);
        var members = await (
                from member in db.CooperativeMembers.AsNoTracking()
                join person in db.Farmers.AsNoTracking() on member.FarmerId equals person.Id
                where member.CooperativeId == cooperative.Id
                orderby person.FullName
                select new CooperativeMemberInfo(person.Id, person.FullName, person.Id == cooperative.LeaderFarmerId))
            .ToListAsync(ct);
        var leader = await db.Farmers.AsNoTracking()
            .Where(f => f.Id == cooperative.LeaderFarmerId)
            .Select(f => new { f.FullName, f.PhoneE164 })
            .SingleAsync(ct);

        var paid = await db.SavingsContributions.AsNoTracking()
            .Where(c => c.CooperativeId == cooperative.Id && c.Status == SavingsContributionStatus.Paid)
            .Select(c => new { c.FarmerId, c.AmountPesewas })
            .ToListAsync(ct);
        var savings = new SavingsInfo(
            paid.Sum(c => c.AmountPesewas) / 100m,
            paid.Where(c => c.FarmerId == farmerId).Sum(c => c.AmountPesewas) / 100m);

        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var order = await db.GroupOrders.AsNoTracking()
            .Where(o => o.CooperativeId == cooperative.Id && o.Status == GroupOrderStatus.Open && o.ClosesOn >= today)
            .OrderBy(o => o.ClosesOn)
            .FirstOrDefaultAsync(ct);
        GroupOrderInfo? orderInfo = null;
        if (order is not null)
        {
            var lines = await db.GroupOrderLines.AsNoTracking().Where(l => l.OrderId == order.Id).ToListAsync(ct);
            orderInfo = new GroupOrderInfo(
                order.Id, order.Product, order.Dealer, order.UnitPricePesewas / 100m, order.AlonePricePesewas / 100m,
                order.TargetBags, lines.Sum(l => l.Bags), order.ClosesOn, order.Status,
                lines.SingleOrDefault(l => l.FarmerId == farmerId)?.Bags ?? 0);
        }

        var sale = await db.GroupSales.AsNoTracking()
            .Where(s => s.CooperativeId == cooperative.Id && s.Status == GroupSaleStatus.Open)
            .FirstOrDefaultAsync(ct);
        GroupSaleInfo? saleInfo = null;
        if (sale is not null)
        {
            var pledges = await db.SalePledges.AsNoTracking().Where(p => p.SaleId == sale.Id).ToListAsync(ct);
            var mine = pledges.SingleOrDefault(p => p.FarmerId == farmerId);
            saleInfo = new GroupSaleInfo(
                sale.Id, sale.Crop, sale.Buyer, sale.PricePerKgPesewas / 100m, sale.MarketPricePerKgPesewas / 100m,
                sale.TargetKg, pledges.Sum(p => p.Bags * p.KgPerBag), sale.Status, mine?.Bags ?? 0, mine?.KgPerBag ?? 100,
                pledges.Count);
        }

        var meeting = await db.Meetings.AsNoTracking()
            .Where(m => m.CooperativeId == cooperative.Id && m.StartsAt >= now)
            .OrderBy(m => m.StartsAt)
            .FirstOrDefaultAsync(ct);
        MeetingInfo? meetingInfo = null;
        if (meeting is not null)
        {
            var rsvps = await db.MeetingRsvps.AsNoTracking().Where(r => r.MeetingId == meeting.Id).ToListAsync(ct);
            meetingInfo = new MeetingInfo(
                meeting.Id, meeting.StartsAt, meeting.Place, meeting.Topic, meeting.Bring,
                rsvps.SingleOrDefault(r => r.FarmerId == farmerId)?.Coming, rsvps.Count(r => r.Coming));
        }

        return new CooperativeDetails(
            cooperative.Id, cooperative.Name, cooperative.Community, cooperative.District, leader.FullName, leader.PhoneE164,
            members, savings, orderInfo, saleInfo, meetingInfo);
    }
}

// ---------- The farmer ----------

/// <summary>GET /api/cooperative: the farmer's cooperative, their savings, the open order and sale, the next meeting.</summary>
public sealed class GetMyCooperative : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/cooperative", Handle).Describe("GetMyCooperative", AuthPolicies.Farmer);

    public static async Task<Ok<CooperativeDetails>> Handle(
        AppDbContext db, ISessionProvider session, IClock clock, CancellationToken ct)
    {
        var (farmer, cooperative) = await Coop.FarmerCooperativeAsync(db, session, ct);
        return TypedResults.Ok(await Coop.DetailsAsync(db, cooperative, farmer.Id, clock.UtcNow, ct));
    }
}

/// <summary>
/// POST /api/cooperative/savings: saves money with the group. Starts a mobile money payment (approved on the
/// phone, as for inputs); the contribution counts once that payment is paid.
/// </summary>
public sealed class AddSavings : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/cooperative/savings", Handle).Describe("AddCooperativeSavings", AuthPolicies.Farmer);

    public static async Task<Ok<PaymentInfo>> Handle(
        AddSavingsRequest request,
        AppDbContext db,
        ISessionProvider session,
        IPaymentGateway gateway,
        IClock clock,
        IOptions<PaystackOptions> options,
        CancellationToken ct)
    {
        var (farmer, cooperative) = await Coop.FarmerCooperativeAsync(db, session, ct);
        var payment = (await StartPayment.Handle(
            new PayRequest(PaymentPurpose.Savings, Coop.Describe($"Savings · {cooperative.Name}"), request.Amount),
            db, session, gateway, clock, options, ct)).Value!;
        var stored = await db.Payments.AsNoTracking().SingleAsync(p => p.Reference == payment.Reference, ct);
        db.SavingsContributions.Add(new SavingsContribution
        {
            Id = Guid.CreateVersion7(clock.UtcNow),
            CooperativeId = cooperative.Id,
            FarmerId = farmer.Id,
            AmountPesewas = stored.AmountPesewas,
            PaymentId = stored.Id,
            Status = stored.Status switch
            {
                PaymentStatus.Paid => SavingsContributionStatus.Paid,
                PaymentStatus.Failed => SavingsContributionStatus.Failed,
                _ => SavingsContributionStatus.Waiting,
            },
            CreatedAt = clock.UtcNow,
        });
        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(payment);
    }
}

/// <summary>PUT /api/cooperative/orders/{id}: joins the group order with this many bags (0 leaves it).</summary>
public sealed class UpdateOrder : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPut("/api/cooperative/orders/{id:guid}", Handle).Describe("UpdateCooperativeOrder", AuthPolicies.Farmer);

    public static async Task<NoContent> Handle(
        Guid id, UpdateBagsRequest request, AppDbContext db, ISessionProvider session, IClock clock, CancellationToken ct)
    {
        var (farmer, cooperative) = await Coop.FarmerCooperativeAsync(db, session, ct);
        if (request.Bags is < 0 or > Coop.MaxBags)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "BAGS_INVALID");
        }

        var order = await db.GroupOrders.SingleOrDefaultAsync(o => o.Id == id && o.CooperativeId == cooperative.Id, ct)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "ORDER_NOT_FOUND");
        if (order.Status != GroupOrderStatus.Open || order.ClosesOn < DateOnly.FromDateTime(clock.UtcNow.UtcDateTime))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "ORDER_CLOSED");
        }

        var line = await db.GroupOrderLines.SingleOrDefaultAsync(l => l.OrderId == id && l.FarmerId == farmer.Id, ct);
        if (request.Bags == 0)
        {
            if (line is not null)
            {
                db.GroupOrderLines.Remove(line);
            }
        }
        else if (line is null)
        {
            db.GroupOrderLines.Add(new GroupOrderLine { OrderId = id, FarmerId = farmer.Id, Bags = request.Bags, UpdatedAt = clock.UtcNow });
        }
        else
        {
            line.Bags = request.Bags;
            line.UpdatedAt = clock.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }
}

/// <summary>PUT /api/cooperative/sales/{id}: promises this many bags for the group sale (0 withdraws).</summary>
public sealed class UpdateSale : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPut("/api/cooperative/sales/{id:guid}", Handle).Describe("UpdateCooperativeSale", AuthPolicies.Farmer);

    public static async Task<NoContent> Handle(
        Guid id, UpdateBagsRequest request, AppDbContext db, ISessionProvider session, CancellationToken ct)
    {
        var (farmer, cooperative) = await Coop.FarmerCooperativeAsync(db, session, ct);
        if (request.Bags is < 0 or > Coop.MaxBags)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "BAGS_INVALID");
        }

        var sale = await db.GroupSales.SingleOrDefaultAsync(
                s => s.Id == id && s.CooperativeId == cooperative.Id && s.Status == GroupSaleStatus.Open, ct)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "SALE_NOT_FOUND");
        var pledge = await db.SalePledges.SingleOrDefaultAsync(p => p.SaleId == sale.Id && p.FarmerId == farmer.Id, ct);
        if (request.Bags == 0)
        {
            if (pledge is not null)
            {
                db.SalePledges.Remove(pledge);
            }
        }
        else if (pledge is null)
        {
            db.SalePledges.Add(new SalePledge { SaleId = sale.Id, FarmerId = farmer.Id, Bags = request.Bags, KgPerBag = 100 });
        }
        else
        {
            pledge.Bags = request.Bags;
        }

        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }
}

/// <summary>PUT /api/cooperative/meetings/{id}/rsvp: says whether the farmer is coming.</summary>
public sealed class UpdateRsvp : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPut("/api/cooperative/meetings/{id:guid}/rsvp", Handle).Describe("UpdateMeetingRsvp", AuthPolicies.Farmer);

    public static async Task<NoContent> Handle(
        Guid id, RsvpRequest request, AppDbContext db, ISessionProvider session, CancellationToken ct)
    {
        var (farmer, cooperative) = await Coop.FarmerCooperativeAsync(db, session, ct);
        if (!await db.Meetings.AnyAsync(m => m.Id == id && m.CooperativeId == cooperative.Id, ct))
        {
            throw new ApiException(StatusCodes.Status404NotFound, "MEETING_NOT_FOUND");
        }

        var rsvp = await db.MeetingRsvps.SingleOrDefaultAsync(r => r.MeetingId == id && r.FarmerId == farmer.Id, ct);
        if (rsvp is null)
        {
            db.MeetingRsvps.Add(new MeetingRsvp { MeetingId = id, FarmerId = farmer.Id, Coming = request.Coming });
        }
        else
        {
            rsvp.Coming = request.Coming;
        }

        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }
}

// ---------- The officer ----------

/// <summary>GET /api/officer/cooperatives: the cooperatives the officer runs, with their details.</summary>
public sealed class GetOfficerCooperatives : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/officer/cooperatives", Handle).Describe("GetOfficerCooperatives", AuthPolicies.Officer);

    public static async Task<Ok<List<CooperativeDetails>>> Handle(
        AppDbContext db, ISessionProvider session, IClock clock, CancellationToken ct)
    {
        var officer = await Coop.UserAsync(db, session, UserRole.Officer, ct);
        var cooperatives = await db.Cooperatives.AsNoTracking()
            .Where(c => c.CreatedById == officer.Id)
            .OrderBy(c => c.Name)
            .ToListAsync(ct);
        var list = new List<CooperativeDetails>();
        foreach (var cooperative in cooperatives)
        {
            list.Add(await Coop.DetailsAsync(db, cooperative, null, clock.UtcNow, ct));
        }

        return TypedResults.Ok(list);
    }
}

/// <summary>POST /api/officer/cooperatives: starts a cooperative led by one of the officer's farmers.</summary>
public sealed class CreateCooperative : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/officer/cooperatives", Handle).Describe("CreateCooperative", AuthPolicies.Officer);

    public static async Task<Ok<CooperativeDetails>> Handle(
        CreateCooperativeRequest request, AppDbContext db, ISessionProvider session, IClock clock, CancellationToken ct)
    {
        var officer = await Coop.UserAsync(db, session, UserRole.Officer, ct);
        if (!Coop.Valid(request.Name) || !Coop.Valid(request.Community, 100))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "COOPERATIVE_DETAILS_REQUIRED");
        }

        if (!await db.Farmers.AnyAsync(f => f.Id == request.LeaderFarmerId && f.RegisteredById == officer.Id, ct))
        {
            throw new ApiException(StatusCodes.Status403Forbidden, "MEMBER_NOT_OWNED");
        }

        if (await db.CooperativeMembers.AnyAsync(m => m.FarmerId == request.LeaderFarmerId, ct))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "MEMBER_ALREADY_IN_COOPERATIVE");
        }

        var now = clock.UtcNow;
        var cooperative = new Cooperative
        {
            Id = Guid.CreateVersion7(now),
            Name = request.Name.Trim(),
            Community = request.Community.Trim(),
            Region = officer.Region ?? "",
            District = officer.District ?? "",
            LeaderFarmerId = request.LeaderFarmerId,
            CreatedById = officer.Id,
            CreatedAt = now,
        };
        db.Cooperatives.Add(cooperative);
        db.CooperativeMembers.Add(new CooperativeMember { CooperativeId = cooperative.Id, FarmerId = request.LeaderFarmerId, JoinedAt = now });
        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(await Coop.DetailsAsync(db, cooperative, null, now, ct));
    }
}

/// <summary>POST /api/officer/cooperatives/{id}/members: adds one of the officer's farmers (one cooperative each).</summary>
public sealed class AddCooperativeMember : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/officer/cooperatives/{id:guid}/members", Handle).Describe("AddCooperativeMember", AuthPolicies.Officer);

    public static async Task<NoContent> Handle(
        Guid id, AddMemberRequest request, AppDbContext db, ISessionProvider session, IClock clock, CancellationToken ct)
    {
        var cooperative = await Coop.OwnedAsync(id, db, session, ct);
        if (!await db.Farmers.AnyAsync(f => f.Id == request.FarmerId && f.RegisteredById == cooperative.CreatedById, ct))
        {
            throw new ApiException(StatusCodes.Status403Forbidden, "MEMBER_NOT_OWNED");
        }

        if (await db.CooperativeMembers.AnyAsync(m => m.FarmerId == request.FarmerId, ct))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "MEMBER_ALREADY_IN_COOPERATIVE");
        }

        db.CooperativeMembers.Add(new CooperativeMember { CooperativeId = cooperative.Id, FarmerId = request.FarmerId, JoinedAt = clock.UtcNow });
        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }
}

/// <summary>POST /api/officer/cooperatives/{id}/orders: opens a group order with a dealer.</summary>
public sealed class CreateOrder : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/officer/cooperatives/{id:guid}/orders", Handle).Describe("CreateCooperativeOrder", AuthPolicies.Officer);

    public static async Task<NoContent> Handle(
        Guid id, CreateOrderRequest request, AppDbContext db, ISessionProvider session, IClock clock, CancellationToken ct)
    {
        var cooperative = await Coop.OwnedAsync(id, db, session, ct);
        if (!Coop.Valid(request.Product, 100) || !Coop.Valid(request.Dealer, 100) || request.TargetBags < 1
            || request.UnitPrice <= 0 || request.AlonePrice < request.UnitPrice
            || request.ClosesOn < DateOnly.FromDateTime(clock.UtcNow.UtcDateTime))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "COOPERATIVE_DETAILS_REQUIRED");
        }

        db.GroupOrders.Add(new GroupOrder
        {
            Id = Guid.CreateVersion7(clock.UtcNow),
            CooperativeId = cooperative.Id,
            Product = request.Product.Trim(),
            Dealer = request.Dealer.Trim(),
            UnitPricePesewas = Coop.Pesewas(request.UnitPrice),
            AlonePricePesewas = Coop.Pesewas(request.AlonePrice),
            TargetBags = request.TargetBags,
            ClosesOn = request.ClosesOn,
            Status = GroupOrderStatus.Open,
        });
        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }
}

/// <summary>POST /api/officer/cooperatives/{id}/sales: opens selling together to a buyer.</summary>
public sealed class CreateSale : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/officer/cooperatives/{id:guid}/sales", Handle).Describe("CreateCooperativeSale", AuthPolicies.Officer);

    public static async Task<NoContent> Handle(
        Guid id, CreateSaleRequest request, AppDbContext db, ISessionProvider session, IClock clock, CancellationToken ct)
    {
        var cooperative = await Coop.OwnedAsync(id, db, session, ct);
        if (!Coop.Valid(request.Crop, 50) || !Coop.Valid(request.Buyer, 100) || request.TargetKg < 1 || request.PricePerKg <= 0)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "COOPERATIVE_DETAILS_REQUIRED");
        }

        db.GroupSales.Add(new GroupSale
        {
            Id = Guid.CreateVersion7(clock.UtcNow),
            CooperativeId = cooperative.Id,
            Crop = request.Crop.Trim(),
            Buyer = request.Buyer.Trim(),
            PricePerKgPesewas = Coop.Pesewas(request.PricePerKg),
            MarketPricePerKgPesewas = Coop.Pesewas(request.MarketPricePerKg),
            TargetKg = request.TargetKg,
            Status = GroupSaleStatus.Open,
        });
        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }
}

/// <summary>POST /api/officer/cooperatives/{id}/meetings: plans a meeting.</summary>
public sealed class CreateMeeting : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/officer/cooperatives/{id:guid}/meetings", Handle).Describe("CreateCooperativeMeeting", AuthPolicies.Officer);

    public static async Task<NoContent> Handle(
        Guid id, CreateMeetingRequest request, AppDbContext db, ISessionProvider session, IClock clock, CancellationToken ct)
    {
        var cooperative = await Coop.OwnedAsync(id, db, session, ct);
        if (!Coop.Valid(request.Place) || !Coop.Valid(request.Topic, 200) || (request.Bring?.Trim().Length ?? 0) > 300
            || request.StartsAt < clock.UtcNow)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "COOPERATIVE_DETAILS_REQUIRED");
        }

        db.Meetings.Add(new Meeting
        {
            Id = Guid.CreateVersion7(clock.UtcNow),
            CooperativeId = cooperative.Id,
            StartsAt = request.StartsAt,
            Place = request.Place.Trim(),
            Topic = request.Topic.Trim(),
            Bring = request.Bring?.Trim() ?? "",
        });
        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }
}

// ---------- The MoFA admin ----------

/// <summary>GET /api/admin/cooperatives: the cooperatives run by officers in the admin's area, in full.</summary>
public sealed class GetAdminCooperatives : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/admin/cooperatives", Handle).Describe("GetAdminCooperatives", AuthPolicies.Admin);

    public static async Task<Ok<List<AdminCooperative>>> Handle(
        AppDbContext db, ISessionProvider session, IClock clock, CancellationToken ct)
    {
        var admin = await Coop.UserAsync(db, session, UserRole.Admin, ct);
        var officerIds = await db.Users.AsNoTracking()
            .Where(u => u.Role == UserRole.Officer
                && (admin.Region == null || u.Region == admin.Region)
                && (admin.District == null || u.District == admin.District))
            .Select(u => u.Id)
            .ToListAsync(ct);
        var cooperatives = await db.Cooperatives.AsNoTracking()
            .Where(c => officerIds.Contains(c.CreatedById))
            .OrderBy(c => c.Name)
            .ToListAsync(ct);
        var list = new List<AdminCooperative>();
        foreach (var cooperative in cooperatives)
        {
            var details = await Coop.DetailsAsync(db, cooperative, null, clock.UtcNow, ct);
            var orders = await db.GroupOrders.AsNoTracking()
                .Where(o => o.CooperativeId == cooperative.Id)
                .OrderByDescending(o => o.ClosesOn)
                .Select(o => new AdminOrder(
                    o.Id, o.Product, o.Dealer, o.UnitPricePesewas / 100m, o.AlonePricePesewas / 100m, o.TargetBags,
                    db.GroupOrderLines.Where(l => l.OrderId == o.Id).Sum(l => (int?)l.Bags) ?? 0,
                    db.GroupOrderLines.Count(l => l.OrderId == o.Id),
                    o.ClosesOn, o.Status))
                .ToListAsync(ct);
            var soldKg = await (
                    from pledge in db.SalePledges
                    join sale in db.GroupSales on pledge.SaleId equals sale.Id
                    where sale.CooperativeId == cooperative.Id && sale.Status == GroupSaleStatus.Delivered
                    select pledge.Bags * pledge.KgPerBag)
                .SumAsync(x => (int?)x, ct) ?? 0;
            list.Add(new AdminCooperative(details, orders, soldKg));
        }

        return TypedResults.Ok(list);
    }
}

/// <summary>
/// POST /api/admin/cooperatives/{id}/remind-pledges: an SMS to members who have not pledged for the open sale.
/// Logged until the SMS provider is connected; answers how many it would reach.
/// </summary>
public sealed class RemindPledges : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/admin/cooperatives/{id:guid}/remind-pledges", Handle).Describe("RemindPledges", AuthPolicies.Admin);

    public static async Task<Ok<RemindResult>> Handle(
        Guid id, AppDbContext db, ISessionProvider session, ILogger<RemindPledges> logger, CancellationToken ct)
    {
        await Coop.UserAsync(db, session, UserRole.Admin, ct);
        var sale = await db.GroupSales.AsNoTracking()
            .FirstOrDefaultAsync(s => s.CooperativeId == id && s.Status == GroupSaleStatus.Open, ct)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "SALE_NOT_FOUND");
        var pledged = db.SalePledges.Where(p => p.SaleId == sale.Id).Select(p => p.FarmerId);
        var count = await db.CooperativeMembers.CountAsync(m => m.CooperativeId == id && !pledged.Contains(m.FarmerId), ct);
        logger.LogInformation("Pledge reminder for cooperative {Id}: {Count} members; SMS pending the SMS provider", id, count);
        return TypedResults.Ok(new RemindResult(count));
    }
}
