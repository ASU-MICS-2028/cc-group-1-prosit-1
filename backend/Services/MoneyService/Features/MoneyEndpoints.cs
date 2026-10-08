using AgroConnect.Data.Entities;
using AgroConnect.Data.Persistence;
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
using Microsoft.Extensions.Options;

namespace AgroConnect.MoneyService.Features;

/// <summary>Shared steps: the signed-in farmer, their wallet, and how a payment is shown.</summary>
internal static class Money
{
    public const decimal MinAmount = 1m;
    public const decimal MaxAmount = 10_000m;

    public static async Task<Farmer> FarmerAsync(AppDbContext db, ISessionProvider session, CancellationToken cancellationToken)
    {
        var farmerId = session.FarmerId ?? throw new ApiException(StatusCodes.Status403Forbidden, "NOT_A_FARMER_ACCOUNT");
        return await db.Farmers.AsNoTracking().FirstOrDefaultAsync(f => f.Id == farmerId, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "FARMER_NOT_FOUND");
    }

    /// <summary>"+233241000001" to "0241000001": how Paystack and the networks write a Ghana number.</summary>
    public static string Local(string e164) => "0" + e164[4..];

    public static WalletInfo ToInfo(Wallet wallet, Farmer farmer) =>
        new(wallet.Network, wallet.PhoneE164, farmer.FullName, wallet.RecipientCode is not null);

    public static PaymentInfo ToInfo(Payment p) =>
        new(p.Reference, p.Purpose, p.Description, p.AmountPesewas / 100m, p.Network, p.Status, p.ProviderMessage, p.CreatedAt);

    /// <summary>Money endpoints: /api/money/..., signed in as a farmer, about the caller's own wallet and payments.</summary>
    public static RouteHandlerBuilder ForFarmers(this RouteHandlerBuilder route, string name) =>
        route.WithName(name)
            .WithTags("Money")
            .RequireAuthorization(AuthPolicies.Farmer)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

    /// <summary>Asks the provider how a payment stands, unless it is already settled, and saves the answer.</summary>
    public static async Task RefreshAsync(Payment payment, IPaymentGateway gateway, IClock clock, CancellationToken cancellationToken)
    {
        if (payment.Status is PaymentStatus.Paid or PaymentStatus.Failed)
        {
            return;
        }

        var result = await gateway.CheckAsync(payment.Reference, cancellationToken);
        // A code the network asked for stays needed until the farmer sends it or the payment ends.
        if (result.Status == PaymentStatus.Waiting && payment.Status == PaymentStatus.NeedsCode)
        {
            return;
        }

        payment.Status = result.Status;
        payment.ProviderMessage = Trim(result.Message);
        payment.UpdatedAt = clock.UtcNow;
    }

    public static string? Trim(string? text) => text is null ? null : text.Length > 300 ? text[..300] : text;
}

/// <summary>GET /api/money: the wallet, the latest payments, and whether the provider is live or a sample.</summary>
public sealed class GetMoney : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/money", Handle).ForFarmers("GetMoney");

    public static async Task<Ok<MoneyOverview>> Handle(
        AppDbContext db, ISessionProvider session, IPaymentGateway gateway, CancellationToken cancellationToken)
    {
        var farmer = await Money.FarmerAsync(db, session, cancellationToken);
        var wallet = await db.Wallets.AsNoTracking().FirstOrDefaultAsync(w => w.FarmerId == farmer.Id, cancellationToken);
        var payments = await db.Payments.AsNoTracking()
            .Where(p => p.FarmerId == farmer.Id)
            .OrderByDescending(p => p.CreatedAt)
            .Take(20)
            .ToListAsync(cancellationToken);
        return TypedResults.Ok(new MoneyOverview(
            !gateway.IsLive,
            wallet is null ? null : Money.ToInfo(wallet, farmer),
            payments.Select(Money.ToInfo).ToList()));
    }
}

/// <summary>
/// PUT /api/money/wallet: links the farmer's registered phone on the chosen network. Linking charges nothing:
/// the wallet is registered with the provider so money can be sent to it, and every payment is approved on
/// the phone with the PIN (the app never sees the PIN). Linking again changes the network.
/// </summary>
public sealed class LinkWallet : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPut("/api/money/wallet", Handle).ForFarmers("LinkWallet");

    public static async Task<Ok<WalletInfo>> Handle(
        LinkWalletRequest request,
        AppDbContext db,
        ISessionProvider session,
        IPaymentGateway gateway,
        IClock clock,
        CancellationToken cancellationToken)
    {
        var farmer = await Money.FarmerAsync(db, session, cancellationToken);
        if (farmer.PhoneE164 is null)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "NO_PHONE_FOR_WALLET");
        }

        var recipient = await gateway.CreateRecipientAsync(farmer.FullName, Money.Local(farmer.PhoneE164), request.Network, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status400BadRequest, "WALLET_NOT_ACCEPTED");

        var now = clock.UtcNow;
        var wallet = await db.Wallets.FirstOrDefaultAsync(w => w.FarmerId == farmer.Id, cancellationToken);
        if (wallet is null)
        {
            wallet = new Wallet { Id = Guid.CreateVersion7(now), FarmerId = farmer.Id, PhoneE164 = farmer.PhoneE164, CreatedAt = now };
            db.Wallets.Add(wallet);
        }

        wallet.Network = request.Network;
        wallet.PhoneE164 = farmer.PhoneE164;
        wallet.RecipientCode = recipient;
        wallet.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok(Money.ToInfo(wallet, farmer));
    }
}

/// <summary>POST /api/money/payments: starts a payment from the linked wallet; the farmer approves it on their phone.</summary>
public sealed class StartPayment : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/money/payments", Handle).ForFarmers("StartPayment");

    public static async Task<Ok<PaymentInfo>> Handle(
        PayRequest request,
        AppDbContext db,
        ISessionProvider session,
        IPaymentGateway gateway,
        IClock clock,
        IOptions<PaystackOptions> options,
        CancellationToken cancellationToken)
    {
        var farmer = await Money.FarmerAsync(db, session, cancellationToken);
        if (request.Amount is < Money.MinAmount or > Money.MaxAmount)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "AMOUNT_INVALID");
        }

        var description = request.Description?.Trim();
        if (string.IsNullOrEmpty(description) || description.Length > 100)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "DESCRIPTION_REQUIRED");
        }

        var wallet = await db.Wallets.AsNoTracking().FirstOrDefaultAsync(w => w.FarmerId == farmer.Id, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status400BadRequest, "NO_WALLET");

        var now = clock.UtcNow;
        var payment = new Payment
        {
            Id = Guid.CreateVersion7(now),
            FarmerId = farmer.Id,
            Purpose = request.Purpose,
            Description = description,
            AmountPesewas = (long)Math.Round(request.Amount * 100m, MidpointRounding.AwayFromZero),
            Network = wallet.Network,
            PhoneE164 = wallet.PhoneE164,
            Reference = $"agc_{Guid.CreateVersion7(now):N}",
            Status = PaymentStatus.Waiting,
            CreatedAt = now,
            UpdatedAt = now,
        };
        // Saved before the provider is called: if the call fails half way, the payment can still be looked up.
        db.Payments.Add(payment);
        await db.SaveChangesAsync(cancellationToken);

        var email = $"farmer-{farmer.Id:N}@{options.Value.CustomerEmailDomain}";
        var result = await gateway.ChargeAsync(
            payment.Reference, payment.AmountPesewas, email, Money.Local(wallet.PhoneE164), wallet.Network, cancellationToken);
        payment.Status = result.Status;
        payment.ProviderMessage = Money.Trim(result.Message);
        payment.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok(Money.ToInfo(payment));
    }
}

/// <summary>GET /api/money/payments/{reference}: how a payment stands now (the app asks every few seconds while waiting).</summary>
public sealed class GetPayment : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/money/payments/{reference}", Handle).ForFarmers("GetPayment");

    public static async Task<Ok<PaymentInfo>> Handle(
        string reference, AppDbContext db, ISessionProvider session, IPaymentGateway gateway, IClock clock, CancellationToken cancellationToken)
    {
        var farmer = await Money.FarmerAsync(db, session, cancellationToken);
        var payment = await db.Payments.FirstOrDefaultAsync(p => p.Reference == reference && p.FarmerId == farmer.Id, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "PAYMENT_NOT_FOUND");
        await Money.RefreshAsync(payment, gateway, clock, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok(Money.ToInfo(payment));
    }
}

/// <summary>POST /api/money/payments/{reference}/code: the one-time code a network texted (some Telecel wallets).</summary>
public sealed class SendPaymentCode : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapPost("/api/money/payments/{reference}/code", Handle).ForFarmers("SendPaymentCode");

    public static async Task<Ok<PaymentInfo>> Handle(
        string reference,
        PaymentCodeRequest request,
        AppDbContext db,
        ISessionProvider session,
        IPaymentGateway gateway,
        IClock clock,
        CancellationToken cancellationToken)
    {
        var farmer = await Money.FarmerAsync(db, session, cancellationToken);
        var code = request.Code?.Trim();
        if (string.IsNullOrEmpty(code) || code.Length > 10)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "CODE_REQUIRED");
        }

        var payment = await db.Payments.FirstOrDefaultAsync(p => p.Reference == reference && p.FarmerId == farmer.Id, cancellationToken)
            ?? throw new ApiException(StatusCodes.Status404NotFound, "PAYMENT_NOT_FOUND");
        var result = await gateway.SubmitCodeAsync(reference, code, cancellationToken);
        payment.Status = result.Status;
        payment.ProviderMessage = Money.Trim(result.Message);
        payment.UpdatedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok(Money.ToInfo(payment));
    }
}
