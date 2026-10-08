# AgroConnect architecture, in one page (for presentations)

## The idea
One app at one address, for three people: **farmers** (phone), **extension officers** (phone or computer) and **MoFA admins** (computer). The screen width picks the layout; the signed-in role picks the menus. It works **offline first**: officers register farmers with no network, and the app sends everything when the network comes back.

## The pieces

```
 Phone / computer (PWA)                     AWS af-south-1 (Cape Town)
 ┌────────────────────────┐   HTTPS   ┌───────────┐   ┌──────────────────┐   ┌───────────────────┐
 │ React app              │──────────▶│ CloudFront │──▶│ Load balancer    │──▶│ App servers       │
 │ · works offline        │           └───────────┘   │ (public subnet)  │   │ (private subnets) │
 │ · IndexedDB on device  │                           └──────────────────┘   │ nginx + .NET API  │
 │ · sync queue (outbox)  │                                                  │ Auto Scaling 2–4  │
 └────────────────────────┘                                                  └─────────┬─────────┘
                                                                                       │
                                                 ┌───────────────┬─────────────────────┼──────────────┐
                                                 ▼               ▼                     ▼              ▼
                                           PostgreSQL (RDS)   S3 (photos)        Paystack        GhanaNLP Khaya
                                           private subnet                        (mobile money)  (Twi/Ewe/Dagbani voice)
```

## Frontend: one Progressive Web App
- **React 19, TypeScript, Vite, Tailwind.** Built from the Figma design. Installable like an app. About 1.5 MB is saved on the phone on the first visit, so it opens with no network.
- **Offline first.** The officer's farmers, visits and drafts live on the phone (IndexedDB, through Dexie). Each change also goes into a *to send* queue. When the network returns, the queue is sent to `POST /api/sync` in batches of 100.
- **Accessible to people who cannot read:**
  - a speaker button beside every question;
  - pictures with an emoji fallback when offline;
  - four languages (English, Twi, Ewe, Dagbani).

## Backend: one API, split into services by area (.NET 10)
| Service | What it does |
|---|---|
| AuthService | Sign-in with phone number and a 6-digit SMS code (no passwords), 7-day tokens, roles |
| SyncService | Receives the offline queue; the newest change wins; each record is accepted or refused with a reason |
| FarmerService | The farmer's own record; prices, weather, crop check, harvest forecast, lessons; SMS alert settings |
| HelpService | Farmers' questions (voice or text) go to their officer, who answers; the admin's help desk steps in after 24 h |
| MoneyService | Mobile money through Paystack: link a wallet, pay, check payments; the PIN never touches the app |
| CooperativeService | Savings, group orders, selling together, meetings |
| AdminService | The MoFA admin's overview for their region |
| SpeechService | Speaker buttons in Twi, Ewe and Dagbani through GhanaNLP Khaya, each sentence made once and kept |

**Rules every service follows:**
- one database, with a migration for every change;
- money in pesewas;
- every outside service (Paystack, Khaya, SMS, price and weather feeds) sits behind an interface with a **sample provider**, so the app works and is tested without keys;
- the sample provider is labelled in the app.

## Cloud (AWS, Terraform)
- **Network:** its own VPC in two availability zones. The app servers and the database sit in **private subnets**, with no public IP and no SSH (shell access through Session Manager). Outbound internet goes through fck-nat, a cheap NAT.
- **Traffic:** CloudFront (HTTPS), then the load balancer, then the servers.
- **Servers:** **Auto Scaling**: production runs 2 to 4 servers, staging 1. An unhealthy server is replaced automatically.
- **Data:** PostgreSQL on RDS; S3 for photos, HTTPS only.
- **Images:** containers built in CI and stored in ECR.
- **Watching:** CloudWatch alarms by email, and a monthly budget alert.

## How code reaches users (DevOps)
`feature/*` → pull request → **development** → **staging** → **main** (production).

**CI on every pull request:**
- secret scan;
- lint;
- unit tests with a **70% coverage gate** (backend and frontend);
- Docker builds.

**Deploys:** merging to staging deploys automatically. Production needs a person to approve it.

## Numbers to quote
- Backend:
  - about 250 tests;
  - each service at least 70% covered, most above 90%.
- Frontend: about 190 tests, around 93% of lines covered.
- First load about 1.5 MB, then the app opens offline.
- Production: 2 servers minimum in two zones, so one can fail without downtime.
