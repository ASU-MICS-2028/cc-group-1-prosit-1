# ADR 0034: Mobile money through Paystack

- **Status:** Accepted
- **Date:** 2026-10-08

## Context
The farmer's Money screens (Figma Phase 3) link a mobile money wallet, pay agro-dealers for inputs, and later take loans, pay insurance and get paid. Until now they ran on sample data inside the app.

Connecting each network directly (the MTN MoMo API, Telecel and AirtelTigo) means three integrations, three approvals and three test setups. We need payments working for the Phase 3 demo, with a path to real money.

## Decision
- **Paystack, one provider for all three networks.** Paystack charges Ghana mobile money (MTN, Telecel, AirtelTigo) in GHS through one API, and pays out to mobile money wallets (Transfers).
- **A new backend service, MoneyService,** with endpoints for signed-in farmers only, always about their own wallet:

| Endpoint | What it does |
|---|---|
| `GET /api/money` | The linked wallet, the last 20 payments, and `sample` (true when no Paystack key is set) |
| `PUT /api/money/wallet` | Links the farmer's **registered phone** on the chosen network. Registers it with Paystack as a payout recipient, so money can be sent to it later. **Charges nothing and asks for no PIN** |
| `POST /api/money/payments` | Starts a payment: what it is for, a description, GH₵ 1 to GH₵ 10,000. Paystack asks the network to send the farmer a prompt |
| `GET /api/money/payments/{reference}` | How the payment stands. Asks Paystack when it is not settled yet |
| `POST /api/money/payments/{reference}/code` | The one-time code some networks text instead of a prompt |

- **The PIN never touches the app.** The farmer approves each payment on their phone; the app shows *Approve the payment* and checks every 3 seconds until it is paid or fails.
- **Money is stored in pesewas** (whole numbers), never rounded decimals.
- **Two new tables, `wallets` and `payments`** (migration `AddMobileMoney`). Each payment has a unique reference, saved before Paystack is called, so a retry never charges twice and every payment can be traced.
- **The secret key never enters the repository:**
  - on a laptop it is in user-secrets (`Paystack:SecretKey`);
  - on the servers it is the environment variable `Paystack__SecretKey`.

  The public key is not needed, because every Paystack call is made by the server.
- **Without a key, a sample provider answers.** A charge waits a few seconds, then counts as approved. The app shows "Sample data", and tests and CI never reach Paystack. It follows the provider pattern of ADR 0031.
- **Paystack needs an email for every customer.** Farmers have none, so each gets a placeholder (`farmer-{id}@farmers.agroconnect.app`).
- **Connected now:** the Money home, linking a wallet, and paying for inputs. The products and shops in *Buy inputs* stay sample data until agro-dealers are connected, but the payment itself is real.

## Alternatives considered
- **The MTN MoMo API directly:** MTN only, a separate onboarding, and Telecel and AirtelTigo would still be missing.
- **Paystack's hosted checkout page:** less code, but it opens a web page and expects an email, which is a poor fit for farmers on cheap phones.
- **A small charge to "verify" a wallet when linking:** it proves ownership, but charges farmers just to link and needs a refund flow. The first real payment proves the wallet instead.
- **Webhooks for payment confirmation:** the standard method, but they need the servers on HTTPS, which is still an open issue. Checking with Paystack works until then; webhooks can be added beside it.

## Consequences
- **Farmers can link a wallet and pay with mobile money,** in Paystack test mode today.
- **For real money (needs the team):**
  - Paystack must verify AgroConnect as a registered Ghanaian business (registration documents, ID, bank account), and the account must accept GHS.
  - Live keys go to the DevOps lead as a secret; never commit or share them in chat.
- **The DevOps lead needs to know:**
  - a database migration (`AddMobileMoney`, two new tables);
  - a new secret (`Paystack__SecretKey`);
  - the servers call `https://api.paystack.co` over the internet.
- **Next:**
  - *Get paid* through Paystack Transfers: needs Transfers switched on and money in the Paystack balance; costs GHS 1 per transfer to mobile money.
  - Insurance and loan repayments through the same payments endpoint.
  - Webhooks once the servers have HTTPS.
