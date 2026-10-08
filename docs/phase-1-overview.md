# AgroConnect Ghana: Phase 1 in plain words

Team Godabeg | ICS 534 Cloud Computing, Prosit 1 | We present on Thursday 8 October 2026.

This is the short summary of what we are building, why, and how. It replaces the concise PDF (version 1.0, 4 October) and is kept up to date as the code changes. Decisions are in [`adr/`](adr/), the dated list is in [`decision-log.md`](decision-log.md), and the day-to-day handoff is in [`status.md`](status.md).

_Last updated: Monday 5 October 2026, midday._

## 0. Where we are now

### Done
- **Decisions:** 34 ADRs (short decision notes), including one repository (0017), the backend structure (0020), the UI from Figma (0021), sign-in rules (0022), database naming and links (0023), roles and devices (0024), pictures online and icons offline (0025), the private network (0026, proposed) how the registration form works (0027) and the installable app (0028) the app screens with the sync contract (0029), the computer top bar with the account menu (0030), the farmer's app with sample providers (0031), the sync service (0032), MoFA admin accounts with the Overview (0033), and mobile money through Paystack (0034).
- **Repository and checks:** branch rules, pre-commit hooks, secret scanning, the CI pipeline (frontend, backend, Docker) with the 70% coverage gate, and the deploy pipeline (not tried on a server yet).
- **Backend base:** a thin API host plus services, shared tools, structured logs, standard error answers in the caller's language, and the OpenAPI contract written on every build.
- **Database:** five tables (users, login_codes, farmers, visits, photos) and the first migration, with PostgreSQL-style names (`full_name`) and six enforced links (foreign keys), so the database itself refuses, for example, a visit for a farmer that does not exist. The API creates the tables when it starts and adds a demo officer and a sample farmer on a laptop.
- **Sign-in (new, 5 Oct):** phone number plus a 6-digit SMS code, for officers and farmers. Endpoints: send code, check code, "who am I". Tried live against the local database.
- **Start and sign-in screens, built from Figma and connected to the API (5 Oct):** Welcome, Choose language, Who are you, Log in and Enter code, for officers and for farmers.
  - The app sends the number, shows the server's own error messages (in the user's language), counts down to "Resend code", and opens the officer app or the farmer app after "Verify".
  - Tried live in a browser against the real API and database.
- **App base:** design tokens from Figma, a responsive layout (bottom bar on phones, sidebar on wider screens), Home, Farmers, Sync and Profile pages, and audio buttons (recordings pending).
- **Phone and desktop layouts for the start screens:** one app; the screen width picks the layout. The phone design under 768 px; from 768 px the desktop design from Figma (D01 to D03): a brand panel with the illustration on the left, the form on the right.
- **Registration of a farmer, built from Figma for phones and computers (7 Oct):** the 7 steps (consent, about the farmer, the farm, location and photo, contact, money, help needed), Check and save, Saved, the pink error boxes and the "Check before saving" screen for a shared phone number.
  - Saved on the phone first: the farmer and its "to send" note in one step (IndexedDB). The Home, Farmers and Sync pages now list these farmers and their "waiting" state.
  - Nothing is kept before the farmer agrees. After that every answer is kept as a draft, so a closed app or a flat battery loses nothing.
  - GPS and a photo are optional. The photo is shrunk to about 150 KB on the phone.
  - Phones under 768 px get the phone design (04 to 12). From 768 px the computer design (D07 to D15), with the guide panel from 1024 px.
- **Developer tools:** Swagger UI on laptops (`/swagger`) to try every endpoint, and one-click VS Code tasks that start the database, API and app in visible terminals.
- **Installable app (PWA), 7 Oct:** app icon and manifest, a service worker that saves the whole app for offline use, "Install AgroConnect" and "A new version is ready" messages (ADR 0028). Checked in Chrome: installable with no errors, and the app opens with the network switched off.
- **All Phase 1 app screens from Figma, phones and computers (7 Oct, ADR 0029):** officer Home (with "No farmers yet" and "No network"), My farmers (a table with a preview on computers), the farmer's page, Edit farmer, Sync with "Sync now", Visits and Log a visit, Profile, Log out?, Change language, Help, Install the app, and the farmer's own Home, Help and Profile. One look everywhere (same sizes, colours and cards), menus by role, and Market and Money left for Phase 2.
  - The app sends its waiting farmers and visits by itself (on opening and when the network returns) to `POST /api/sync`.
- **The farmer's app in full (7 Oct, ADR 0031):** the farmer sees their farm, their officer (with a Call button) and their visits, can ask their officer to change their details, and has Market prices, Weather, Check my crop, Harvest forecast, My cooperative and Lessons. Their own data is real; prices, weather and the other outside sources come from sample providers, clearly labelled "Sample data", until each live source is connected. Every farmer screen opens offline with the last saved answer.
- **Offline registration reaches the server (7 Oct, ADR 0032):** `POST /api/sync` stores the farmers and visits officers saved offline. A farmer registered in the field can sign in with their own number as soon as the officer's phone has synced. Sending twice never copies a record; the newest change wins; an officer can only change their own records; a record that breaks a rule comes back as "To fix" with the reason, and the rest are still stored. The app sends 100 records per request so a weak 2G signal can carry it.
- **Tests:** backend 190 tests (sign-in 99%, farmer service 100% and sync 99% of lines covered; every project above 70%; includes a test that the database refuses broken links and an end-to-end test from offline registration to the farmer signing in); frontend 133 tests, 94.7% of lines covered (every registration step, drafts, duplicates, GPS and photo, editing, visits, sync in batches, log out, language, install, the farmer's app). Lint, format and build pass. First screen about 102 KB gzipped (budget 200 KB); every other screen loads separately.

### Next steps, in order
1. **Sync, second half (backend and app, Bernard and Liza):** `GET /api/sync/changes`, so a phone or laptop also receives what the officer saved on another device; then the duplicate phone check across phones and the photo upload with its link check.
2. **Planned visits and the MoFA side (ADR 0024):** visit plans from the server ("Tomorrow", "Start visit"), the admin role, sign-in and *Add a person*, and the MoFA reports page (D20).
3. **Install on a real phone:** try the installed app on a cheap Android phone over USB (port forwarding), then from staging once it has HTTPS (DevOps lead).
4. **USSD and SMS** with the Africa's Talking sandbox.
5. **Translations and recordings (Germain and the community):** Twi, Ewe and Dagbani texts and the voice prompts.

### What we test on a laptop (automatic, on every change)
- Build, style checks, unit tests and database tests (real PostgreSQL in Docker).
- The API running against the local database, with every endpoint called end to end.
- The app and its tests, and the app and the API running together.
- The API contract and the app's download size.

### What needs a real phone, accounts or servers
- **Real SMS:** an Africa's Talking account and key. Until then the code is written to the API log, and on a laptop it is always `123456`.
- **A real phone:** install the app, airplane mode then sync, GPS and the camera in the registration form (they need HTTPS on a server, or the laptop's address), speed on a cheap Android.
- **Design review:** compare the screens with Figma on a phone.
- **CI on GitHub:** every pull request runs the full checks.
- **Servers (Mubarak and the DevOps lead):** HTTPS, the two EC2 servers, the database, the photo bucket, and the `Auth__SigningKey` secret.
- **Languages (Germain and the community):** Twi, Ewe and Dagbani words and the voice recordings.

## 1. The big picture

AgroConnect helps small farmers in Ghana get advice, market prices and money services. Today there is about **one extension agent for every 1,500 farmers**. Phase 1 is the first piece: **register a farmer and save their details, even with no internet**.

What we are building:
- **An app you install from the browser** (a PWA). No app store. It works with no signal and sends the data later.
- **A phone menu for simple phones** (USSD, the `*123#` kind). One in four farmers has no smartphone.
- **One backend** in C#, with a PostgreSQL database and private photo storage.
- **Four languages:** English, Twi, Ewe and Dagbani, with recorded voice for people who cannot read.
- **A test server and a live server**, kept apart, with automatic checks before anything goes live.

### The ten big decisions

| # | Decision | What we chose | Why, in plain words |
|---|---|---|---|
| 1 | Where we host | AWS, Cape Town | The team knows it (a stated bias). Faster for Ghana than Ireland (116 to 136 ms against 166 to 178 ms). Price within 1% of Azure. |
| 2 | The app | One installable web app (React, TypeScript, Vite) | No app store, one codebase, works on old Android phones. |
| 3 | Simple phones | USSD and SMS through Africa's Talking | Work on any phone, with no data. |
| 4 | Backend language | C# (.NET 10) | Safe code, little memory on a small server, good tools. |
| 5 | Database | PostgreSQL on the server, IndexedDB on the phone | Farmer records are linked data, so SQL fits. The phone needs a box that works offline. |
| 6 | Sync | Save on the phone first, send later, never duplicate | Each record gets its ID on the phone, so sending it twice does no harm. |
| 7 | Sign-in | Phone number plus a one-time SMS code | Everyone has a number. Not everyone has a Ghana Card. |
| 8 | Where the code lives | One repository | Four people, four days, one set of checks. |
| 9 | Going live | Pipeline: test server, then live server with approval | A bad change cannot hurt the live system; it rolls back by itself. |
| 10 | Quality rule | Tests with every change, at least 70% covered | The pipeline blocks changes that break the rule. |

### What we will show on Thursday (about 12 minutes)
1. Install the app from the live address on an Android phone, pick Twi, hear a voice prompt.
2. Airplane mode: register a farmer with GPS and a photo. The app says "Saved on this phone, 1 waiting".
3. Network back on: "All synced". Show the record on a second phone and in the database.
4. USSD simulator: register another farmer; an SMS confirms it.
5. Merge a small change and watch it reach the test server, then (after approval) the live server. Show a rollback.
6. Show the Lighthouse audit, the test results and the decision notes.

> **One honest warning.** The servers do not have HTTPS yet. Without it the browser will not install the app, run it offline or read GPS. This is the first thing to fix. Owner: Cloud lead.

## 2. The problem and what we must build

**Why it matters.** About 1 agent per 1,500 farmers (FAO says 1 per 500 is healthy). About 18% of Ghana's maize is lost after harvest (about US$134 million a year). We design for Northern Ghana first, the hardest case: 32.8% can read in Savannah, about 24% use the internet, 2G reaches about 97%. So we assume a basic phone, a weak signal and a user who may not read.

**Who uses it.**
- **Farmers:** 15,000+. 7 in 10 have a basic smartphone, 1 in 4 a simple phone, 1 in 20 no phone.
- **Extension officers:** 250, often with no signal.
- **Later users:** agro-dealers (Weeks 2 and 3).
- **Others involved:** MoFA (reports), the mobile networks, and partner farmer groups.

**Week 1 must-haves.**
- The app works offline and comes in four languages, with voice and recorded consent.
- The registration form covers personal, farm, contact, money and help-needed details.
- It saves on the phone first and syncs later, with photos shrunk to about 150 KB.
- Farmers can be listed, searched and edited.
- Should-haves: USSD with an SMS, and phone sign-in.
- Could-haves: a MoFA summary and duplicate warnings.

**How well it must work.**
- Under 200 KB of JavaScript on the first screen.
- Every Phase 1 screen works offline.
- 99.5% uptime.
- HTTPS, encrypted data and no secrets in the code.
- Big buttons, strong contrast, icons and voice.
- Stays inside the course credits.

**Who does what.**

| Role | Who | Owns |
|---|---|---|
| Cloud and infrastructure | Mubarak Tijani | AWS, servers, database, storage, HTTPS, secrets |
| App and PWA | Bernard Marfo Adjei | The app, offline engine, form, backend, USSD |
| Data | Liza Aikins | Database design, sync rules, API contract |
| Community and docs | Germain Emil Allotey-Pappoe | Partners, translations and recordings, consent, privacy |
| DevOps | @Xenongt1 | Pipeline, deploy files, branch protection, server secrets |

## 3. How the system fits together

```
Phone (Chrome, Android)                       Server (Docker Compose, Ubuntu 24.04)
┌───────────────────────────┐   HTTPS   ┌──────────────────────────────────────────┐
│ PWA (React)               │ ────────▶ │ nginx: serves the app, passes /api/* on  │
│ Service worker (offline)  │           │        │                                 │
│ Phone database (Dexie):   │           │        ▼                                 │
│ farmers, visits, photos,  │           │ Backend (ASP.NET Core 10)  ──SQL──▶  PostgreSQL
│ "to send" queue           │           │ /api/auth, /api/sync, /api/farmers, ...  │
└───────────────────────────┘           └──────────────────────────────────────────┘
        │ photo upload (short-lived link)            ▲
        ▼                                            │ USSD / SMS callbacks
  Private photo storage (S3)               Africa's Talking  ◀── simple phones
```

**One request, from phone to database.**
1. The phone opens our address. nginx sends the app; the service worker keeps a copy on the phone.
2. From then on the app opens from the phone itself, even with no signal.
3. On sync the app calls `/api/...`; nginx passes it to the backend. One address means no CORS problems.
4. The backend checks the data and saves it in one go.

**The backend inside (ADR 0020).** One program, split into services:
- **The host:** `backend/APIs/agroconnect-api` starts the app and contains no logic.
- **The services:** each area is one project under `backend/Services/`:
  - `PlatformService`: health and languages.
  - `AuthService`: sign-in.
  - `FarmerService`: sync, farmers and photos (next).
- **Shared code:** lives in `Services/Libs`:
  - `SharedLibrary`: phone numbers, errors, languages.
  - `Data`: the database tables and migrations.
- **Endpoints:** each one is a single file in a service's `Features/` folder.

The full file guide is in [`project-structure.md`](project-structure.md). One program means one deploy and easy testing; the service folders are the places we will cut if we split it later (section 10).

**The six checks the course asks for.**

| Check | What we do | Still weak |
|---|---|---|
| Run it well | Everything is code; health check; ADRs; rollback by image version | Basic monitoring only (Week 4) |
| Security | HTTPS (planned), private database and bucket, rate limits, hashed codes, secret scanning | No HTTPS yet; SSH port open (key only) |
| Reliability | Servers can be rebuilt; health check with rollback; the phone keeps working offline | One server and one zone each |
| Speed | Small downloads, lazy pages, system font, photos shrunk on the phone | t3.micro has a low CPU limit |
| Cost | One small server each; test server can be stopped; budget alerts | Cape Town costs about 19% more than Ireland |
| Sustainability | Right-sized servers, small data | South Africa's power is coal-heavy; we chose speed and wrote it down |

**How reliable is it?**
- **Downtime adds up.** Two parts that are each up 99.5% of the time are up 99.0% together, but the phone saves offline, so farmers lose less than the server does.
- **A dead server** is rebuilt from the setup script in about 20 to 30 minutes.
- **Data loss target:** 24 hours at most.

## 4. The tools we chose (and why)

One rule: **the farmer pays for every kilobyte**. A tool earns its place only if it does something hard we would otherwise get wrong. This is the summary; [`tech-choices.md`](tech-choices.md) lists **every** package, container image and tool with its version, what it does, why we chose it and what we rejected.

| Part | What we use | Why | Not used |
|---|---|---|---|
| Screens | React 19 + React Compiler | Known, many ready parts, fewer redraws on cheap phones | Angular (heavy), Next.js (needs a server) |
| Build | TypeScript 6, Vite 8, Node 24 LTS | Catches mistakes early; fast | webpack, Create React App |
| Look and feel | Tailwind 4, shadcn/ui on Base UI, system font, Figma design | Only used styles ship; accessible parts | MUI, web fonts |
| Pages and forms | react-router 7, react-hook-form, zod 4 | Each page loads on its own; one rule gives checks and types | Formik, Yup |
| Offline | Dexie (phone database), vite-plugin-pwa (Workbox) | Usable offline storage; reliable updates | localStorage, hand-written service worker |
| Languages and photos | i18next, browser-image-compression | Missing words fall back to English; 3 to 5 MB photo becomes about 150 KB | Resizing on the server |
| App tests | Vitest, Testing Library, ESLint, Prettier | Tests check what the user sees | Jest, Cypress |
| Backend | .NET 10, EF Core 10, Npgsql, Serilog, JWT bearer tokens | Supported to 2028, small memory, built-in API contract | Java, Python, Node |
| Backend tests | xUnit, Testcontainers (real PostgreSQL), NSubstitute, coverlet | Tests run on the real database; coverage enforced | SQLite or in-memory fakes |
| Servers | AWS Cape Town, EC2, Ubuntu 24.04, Docker, GitHub Actions, GHCR | Lab 2 sizing; packaged programs; automatic checks | Kubernetes (too costly) |

Left out on purpose:
- Redux and TanStack Query: the phone database already holds our data.
- moment.js: the browser formats dates itself.
- MediatR, AutoMapper and FluentAssertions: they now need paid licences.
- Micro-frontends: not in Phase 1.

## 5. Working without internet

**Where the data lives.** Both SQL and a phone database, for different jobs:
- **PostgreSQL on the server** is the real record. A farmer has visits, photos and consent, and saving must never be half done.
- **IndexedDB on the phone** is the waiting box for things not yet sent.

**The tables today** (in `backend/Services/Libs/Data/Entities/`, created by the migration in `Data/Migrations/`). Every column, the meaning of each code number, and how MoFA, officers and farmers connect are in [`data-dictionary.md`](data-dictionary.md):

| Table | What it holds |
|---|---|
| `users` | People who can sign in: officers (added by MoFA; seeded for now) and farmers (created on first sign-in). Phone plus role is unique. |
| `login_codes` | One row per SMS code: a hash of the code (never the code), expiry, wrong tries, when it was used. |
| `farmers` | One row per farmer with all 7 registration steps. Lists such as crops are stored as arrays. The ID is made on the phone. The phone number is **not** unique, because families share phones. |
| `visits` | An officer's visit to a farmer: date, status, topics, what was seen, notes, photo IDs. |
| `photos` | Facts about each photo (who, which farmer, type, size); the image itself lives in storage. |

Every farmer and visit row has two times: `client_updated_at` (when it changed on the phone) and `server_updated_at` (when the server stored it). Phones ask for "changes since" the server time.

**How saving works** (step 1 is built; steps 2 to 5 come with the farmer service):
1. The app saves the farmer and a "to send" note on the phone in one step, and shows "Saved on this phone, waiting to sync". The tables on the phone are in [`data-dictionary.md`](data-dictionary.md) section 4.7.
2. It sends when the network comes back, when the app opens, or on "Sync now".
3. It calls `POST /api/sync` with a batch of farmers and visits. The server answers for each item: created, updated, unchanged, not allowed, or invalid.
4. If sending fails it waits 1, 2, 4, 8 seconds and retries. Sending twice does no harm, because the IDs are made on the phone. Real data mistakes are not retried; the user fixes them.
5. The app then calls `GET /api/sync/changes?since=...` to get newer records, such as those made on another phone.

**Two people change the same farmer.** The newest change wins. If a phone clock is ahead of the server, the server's time is used. The known limit: if two people change the same farmer while both are offline, the older change is lost. A conflict log and field-by-field merging are planned.

**Photos and GPS.** The rear camera opens through a file input. The photo is shrunk on the phone. GPS needs HTTPS, shows its accuracy, and never blocks a registration. Photos follow ADR 0008: the backend gives a short-lived upload link and the photo goes to private storage. On a laptop, until the S3 bucket exists, the link points at the API, which keeps the file on disk.

**Private data.**
- Names and phone numbers never go in logs; they are masked, e.g. `***0001`.
- GPS and photos need consent.
- Money details are stored as bands, not amounts.

## 6. Languages, simple phones, sign-in and security

**Languages and voice.**
- English is built in. Twi, Ewe and Dagbani are separate files, empty until native speakers translate, so English shows meanwhile.
- Voice prompts are recorded, not computer voices: short MP3s of about 16 KB each, loaded per step.
- Native speakers translate and check the words, and the voice prompts get recorded. Germain leads this with the community.
- Error messages from the server also come in the caller's language (the `X-Language` header).

**Simple phones.**
- **USSD:** Africa's Talking calls `/api/ussd` and we answer `CON` (more to come) or `END`, one short question per screen.
- **SMS:** 160 characters, but only 70 with Twi or Ewe letters, so messages stay short.

**Sign-in (built 5 October; this changed from the PDF).**

| | PDF plan (4 Oct) | What we built, and why |
|---|---|---|
| Code lifetime | 5 minutes | **10 minutes**: SMS can be slow on 2G. |
| Resend | not set | **Once every 45 seconds**, at most **5 codes per hour** per phone. |
| Wrong tries | "locked after too many" | **5 wrong tries**, then a new code is needed. |
| Token | 15 minutes | **7 days**: officers work offline for days and cannot sign in again in a field with no signal; a week also limits what a lost phone can do. Signing out removes it from the phone. |
| Roles | farmer, agent, admin | **officer** and **farmer** now; admin with the MoFA summary later. |

How it protects people:
- Codes are stored only as a keyed hash tied to the phone.
- "Send code" answers the same whether or not the number has an account, so nobody can find out who is registered.
- Each network address is limited to 30 sign-in requests per 5 minutes.
- The signing key is a secret set on the server (`Auth__SigningKey`), never in the code. The API refuses to start without it.

Full reasoning: [ADR 0022](adr/0022-sign-in-codes-and-tokens.md). Known gap: a token cannot be cancelled from the server before its 7 days are up. A "sign out everywhere" switch is planned.

**Security and privacy.**

| What could go wrong | What we do |
|---|---|
| Someone pretends to be an officer | SMS code limits, signed tokens, role checks on every endpoint |
| Data changed on the way | HTTPS (planned), server-side checks |
| Someone denies a change | We record who registered each farmer and who logged each visit |
| Data leaks | Private database and bucket, no personal data in logs, hashed codes |
| Overload or abuse | Rate limits, size limits, budget alerts |
| Someone gets more rights | Role tests, non-root Docker, least access |

**The law (Ghana Data Protection Act 2012):**
- Recorded consent comes first.
- We collect only what we need.
- People can see, correct and delete their data.
- We have a breach plan.
- Test data is always fake.

**Still weak (said plainly):**
- No HTTPS yet, and the SSH port is open (key only).
- The phone database is not encrypted.
- SMS codes are not live yet; a fixed test code is used.
- We have not agreed how long we keep data.

## 7. Test servers and live servers

| | Your laptop | Automatic checks | Test server (staging) | Live server (production) |
|---|---|---|---|---|
| For | Building and fixing | Proving each change is safe | QA, rehearsal, load tests | Real farmers, officers, MoFA |
| Code gets there | Any branch | Every pull request | Merge to `staging` deploys | Merge to `main` deploys after approval |
| Database | PostgreSQL in Docker (port 5433) | Throwaway PostgreSQL | PostgreSQL container, fake data | RDS (private, encrypted, backups) |
| Sign-in codes | Always `123456`, shown in the log | Fixed test code | Africa's Talking sandbox | Live SMS |
| Secrets | `appsettings.Development.json` (laptop-only values) | GitHub secrets | `staging` secrets | `production` secrets, approval needed |

**Why two servers:** a bad release, a heavy test or a broken database change only hurts the test server.

**HTTPS:** we recommend Caddy with a real domain (about $10 a year) for free, self-renewing certificates.

**Costs (Lab 2):** a t3.micro is $9.93 a month; a t3.small about $19.80. Two servers plus a database go above the $5 alert, so we use course credits and stop the test server when idle.

## 8. How changes go live and how we test

**Branch flow:** `feature/...` goes to `development` (never deployed), then `staging` (deploys to the test server), then `main` (live, after approval). One required check, "CI passed", runs:
- branch rules and the pre-commit checks
- the secret scan
- the frontend: lint, format, audit, tests at 70% or more, build
- the backend: format, build, tests at 70% or more for every test project
- the Docker builds.

**Deploy:** build once per merge, tag the image with the commit, pull it over SSH, check `/health` up to 20 times, and roll back by itself if it stays red.

| How we check | Tools | What it proves | When |
|---|---|---|---|
| Style and safety | TypeScript, ESLint, Prettier, dotnet format, gitleaks, npm audit | No style errors, secrets or weak libraries | Every commit |
| Small tests | Vitest, Testing Library, xUnit | Rules work: phone format, code limits, screens | Every PR |
| Real database and API | Testcontainers PostgreSQL, the API run in memory | Migrations, sign-in end to end, who may do what | Every PR |
| Whole journeys (planned) | Playwright (offline, 2G), Lighthouse, k6 | Install, offline then sync, load | Before going live |
| Real people | 2 farmers per language, 2 officers | People can finish the tasks | Each release |

**Running it on a laptop:** see [`local-development.md`](local-development.md). It covers every command we run, what it does, the three layers of health checks, how to look inside the database, and how the laptop maps to the servers. Short version:
1. From `backend/`, start the database: `docker compose -f docker-compose.dev.yml up -d db`.
2. Start the API: `dotnet run --project APIs/agroconnect-api`.
3. Open `http://localhost:8000/health`. Sign in as the demo officer with phone `0240000001` and code `123456`.

## 9. Plan for Thursday, risks and decisions

| Day | What should be true by the evening | Status |
|---|---|---|
| Sun 4 | Branch merged, checks green, backend health check and first migration | Done (migration on 5 Oct) |
| Mon 5 | Sign-in; farmer and sync endpoints with tests; phone database and sync engine; form started | Sign-in done; the rest in progress |
| Tue 6 | Form finished with voice; installable app; HTTPS on the test server; first automatic deploy; go/no-go on the "Should" items | |
| Wed 7 | Photo and GPS; USSD with the simulator; live server; backup and rollback drills; native speaker tests; freeze in the evening | |
| Thu 8 | 08:00 smoke test, two rehearsals, present. Plan B: test server, offline demo on the phone, recorded pipeline screens | |

| Top risks | How bad | What we do | Who |
|---|---|---|---|
| No HTTPS on the servers | Critical | Caddy and a domain; try it on the test server first | Mubarak, DevOps lead |
| Translations and voice late | High | Demo English plus two languages; the rest fall back | Germain |
| Too much to build | High | Must / Should / Could; core path first | Bernard |
| Deploy or secrets fail on the day | High | Dry run Tuesday; set `Auth__SigningKey` early | DevOps lead |
| Newest-wins loses an edit | Medium | Documented; conflict log planned | Liza |
| Personal data without agreed rules | High | Fake data in the demo | Germain |

**Still to decide:**
- RDS or a database container for the live server.
- How long we keep data.
- Which languages we demo.
- The live server size.
- Sign-off on ADRs 0006, 0007 and 0015.

## 10. After Phase 1: splitting it into parts

After Phase 1 we plan to make AgroConnect fully modular:
- separate frontend and backend repositories
- a small app shell that loads features as plug-ins (micro-frontends)
- backend services behind an API gateway, each with its own database and talking through a message queue.

The goals are that no single failure stops everything and that each part can be tested on its own. We build everything together now on purpose: four people, four days, a 200 KB budget, and no proof yet of where the cuts belong. The cuts already exist as folders: each backend service only uses its own tables, and app features do not import each other.

Order of splitting:
1. Split the repositories when more people join.
2. Build the shell and the plug-in features when Weeks 2 and 3 need parallel teams.
3. Take out the services (sign-in first, then sync, content, USSD) when load, team size or the law needs it.
