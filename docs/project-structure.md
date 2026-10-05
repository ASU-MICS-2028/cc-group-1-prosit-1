# AgroConnect: repo layout (one repo, `frontend/` + `backend/`)

Decided 2026-10-04 in [ADR 0017](adr/0017-single-repository.md), pipeline in [ADR 0019](adr/0019-devops-pipeline.md): **one repo**, one folder per deployable service, shared CI/CD and docs at the root. Folder names `frontend/` and `backend/` match what the DevOps pipeline expects.

```
cc-group-1-prosit-1/
├── frontend/           the Vite React PWA (section 3)
│   ├── public/  src/  index.html  package.json  vite.config.ts  tsconfig*.json  eslint.config.js ...
│   ├── Dockerfile  .dockerignore  .nginx/nginx.conf
│   └── .env.example    (to add)
├── backend/            the ASP.NET Core 10 solution, C# (section 4)
│   ├── APIs/  Services/  tests/  openapi/  AgroConnect.sln
│   └── Dockerfile
├── deploy/             EC2 bootstrap script, docker-compose.yml, deployment runbook (DevOps lead)
├── .github/            workflows/ci.yml, workflows/deploy.yml, CODEOWNERS, dependabot.yml, PR + issue templates
├── .pre-commit-config.yaml   the one hook system (ADR 0018)
├── docs/               architecture decisions, status, data dictionary
├── CONTRIBUTING.md     team rules enforced by CI
├── .gitignore  .gitattributes
└── README.md
```

**Layout rule:** a folder is either a service (`frontend/`, `backend/`) or shared. Anything a service needs to build itself (Dockerfile, nginx config, `.env.example`) lives inside it. Anything that wires services together (compose, deploy scripts, CI) lives at the root or in `deploy/`.

**How `frontend/` and `backend/` stay in step:**
- **The API contract lives in `backend/`.** ASP.NET Core publishes an OpenAPI document (`/openapi/v1.json`), committed as `backend/openapi/agroconnect.json`. `frontend/` generates its TypeScript types from it with `openapi-typescript`, so a renamed field breaks the frontend build in the same PR, not on the farmer's phone.
- **Each service builds its own Docker image**, pushed to GHCR as `.../frontend` and `.../backend`, tagged `sha-<commit>`. The compose file on each EC2 only *pulls* images by tag, so each service deploys and rolls back independently.
- **One branch flow:** `feature/*` → `development` → `staging` → `main`. A feature that touches both services is one branch and one PR.
- **Path-filtered CI:** `frontend/**` triggers the frontend job, `backend/**` the backend job; a docs-only PR builds nothing.
- **At runtime** the frontend's nginx serves the PWA and proxies `/api/*` to the backend container, so the browser sees a single origin.

---

## 1. Root files

| File | What goes in it | Why |
|---|---|---|
| `README.md` | What AgroConnect is, how to run locally, contribution and branch rules, link to `deploy/README.md` | First thing the lecturer opens |
| `.gitignore` | `node_modules/`, `dist/`, `coverage/`, `bin/`, `obj/`, `.env`, `*.pem`, `*.key`, `*.user`, `.vs/` (patterns without a leading `/` match inside both services) | Keeps build output and secrets out of a public repo |
| `.gitattributes` | `* text=auto` and `*.sh text eol=lf` | You're on Windows; without this, shell scripts get CRLF and fail on the Ubuntu EC2 |
| `.vscode/tasks.json` | One-click tasks: start the database, API and app in visible terminals; update the app's API types | Everyone runs the project the same way (see `docs/local-development.md` 5.0) |
| `.vscode/extensions.json`, `.vscode/settings.json` | Recommended extensions (Tailwind, ESLint, PostgreSQL) and shared editor settings | Same tools for the whole team |

---

## 2. `.github/` and `deploy/` (owned by the DevOps lead)

```
.github/
├── workflows/
│   ├── ci.yml        every PR: branch-flow + branch-name check, pre-commit hooks, gitleaks, then path-filtered
│   │                 frontend (lint, format check, npm audit, unit tests >= 70%, build), backend (dotnet format,
│   │                 build, tests >= 70%) and Docker builds. One required check: "CI passed".
│   └── deploy.yml    push to staging -> deploy to staging; push to main -> deploy to production after approval;
│                     manual run = rollback to an older image tag
├── pull_request_template.md  includes the unit-test checklist
├── ISSUE_TEMPLATE/   bug_report.md, feature_request.md
├── dependabot.yml    weekly: github-actions, npm (/frontend), nuget (/backend), docker (/frontend)
└── CODEOWNERS        .github/, deploy/, Dockerfiles, compose files, frontend/.nginx/ -> DevOps lead

deploy/
├── README.md         runbook: environments, one-time EC2 setup, secrets, rollback, hotfixes
├── docker-compose.yml   backend (8080, health check on /health) + frontend (nginx on 8080), run from /opt/agroconnect
└── ec2-bootstrap.sh  installs Docker, creates the deploy user, key-only SSH
```

---

## 3. `frontend/` (React PWA)

Vite + React + TypeScript. Each screen from the Figma design is one file in `src/features/<area>/`, loaded only when it is opened. Items marked *(next)* are planned and not built yet.

```
frontend/
├── public/
│   ├── illustrations/        pictures from Figma, optimised SVG (welcome, language-banner, phone-login, consent), loaded only when shown
│   ├── icons/                small icons from Figma (sprout, user-check, monitor, crops, money...)
│   └── audio/ (next)         en/ tw/ ee/ dag/: one short recorded prompt per question key, e.g. who.mp3
├── src/
│   ├── main.tsx              mount React
│   ├── App.tsx               the router
│   ├── app/
│   │   ├── router.tsx        every route; start screens for signed-out people, /farmer for farmers, / for officers
│   │   ├── guards.ts         who may open what: signed out -> start screens; officer -> /; farmer -> /farmer
│   │   ├── AppLayout.tsx     officer layout: floating bottom bar on phones, sidebar on wider screens
│   │   └── nav.tsx, navItems.ts   the bottom bar and sidebar
│   ├── features/
│   │   ├── start/            00 Welcome, 01 Language, 01b Who are you, 02a/c Log in, 02b/d Enter code (login.ts: shared helpers)
│   │   ├── home/             03 Officer home
│   │   ├── registration/     04-12 the 7-step registration form, review, saved (next)
│   │   ├── farmers/          13 list, 14 detail, 20 edit
│   │   ├── sync/             15 sync
│   │   ├── profile/          16 profile and settings, 25 log out
│   │   ├── farmer/           23 farmer home and the farmer's own screens
│   │   └── design/           component sheet, development only (/design)
│   ├── api/
│   │   ├── client.ts         fetch wrapper: /api paths, the user's language (X-Language), the sign-in token, errors as ApiError
│   │   ├── auth.ts           requestCode, verifyCode
│   │   └── schema.d.ts       GENERATED by `npm run api:types` from ../backend/openapi/agroconnect.json; never edit by hand
│   ├── auth/
│   │   └── session.ts        the signed-in person and token, kept on the phone for the token's 7 days; log out clears it
│   ├── db/ (next)            Dexie: farmers, visits, photos, outbox on the phone
│   ├── i18n/
│   │   ├── index.ts          i18next setup, language saved on the phone
│   │   └── locales/          en.json (built in), tw.json, ee.json, dag.json (downloaded only when chosen)
│   ├── components/
│   │   ├── ui/               shadcn primitives (button)
│   │   ├── ScreenShell.tsx   full screen without the bottom bar: phone layout, a centred card on tablets, and the desktop brand-panel layout from 1024 px
│   │   ├── BackButton.tsx, QuestionTitle.tsx (question + speaker), IllustrationCard.tsx
│   │   ├── PhoneField.tsx    the "+233" phone box; CodeInput.tsx the six code boxes (one real input underneath)
│   │   ├── AudioButton.tsx   speaker button that plays /audio/<lang>/<key>.mp3
│   │   └── LanguageOptions.tsx, LanguagePicker.tsx, SyncStatus.tsx, PageHeader.tsx, FieldArt.tsx
│   ├── lib/
│   │   ├── phone.ts          toE164 ("024 000 0001" -> "+233240000001"), maskPhone, initials
│   │   ├── audio.ts          promptAudio(key): the recording for the current language
│   │   └── utils.ts          cn() class helper
│   ├── index.css             Tailwind + the Figma colour tokens
│   └── test/                 Vitest setup; renderRoute (opens the app at a path, signed in or not)
├── index.html                theme colour, lang attribute
├── vite.config.ts            React + React Compiler + Tailwind; dev proxy /api -> http://localhost:8000; test settings
├── components.json           shadcn config
├── tsconfig*.json            path alias @/* -> src/*
├── eslint.config.js, .prettierrc.json
├── Dockerfile                stage 1 node build -> stage 2 nginx-unprivileged serving dist/ on 8080 (DevOps lead's file)
├── .nginx/nginx.conf         SPA fallback, caching, /api proxy to the backend (DevOps lead's file)
└── .env.example              VITE_API_BASE_URL (empty: same address as the app)
```

**The three design rules that make this impressive:**
1. **The phone is the source of truth until sync.** Every save writes to Dexie and adds an outbox entry first, so Save never waits for the network.
2. **IDs are made on the phone** (`crypto.randomUUID()`), so retrying a sync never creates duplicates.
3. **Background Sync is Chrome-only.** `syncEngine.ts` also runs on the `online` event and when the app opens, so it works on every browser.

---

## 4. `backend/` (ASP.NET Core 10 LTS, C#, services as class libraries behind a thin API host)

The same layout the company's backends use (ADR 0020), on plain ASP.NET Core with our own small feature base. A request comes into the host, which hands it to one feature class in a service; the feature uses the shared tools and the database.

```
backend/
├── AgroConnect.sln                    the list of all projects (build and test everything with it)
├── APIs/agroconnect-api/              thin host, no business logic
│   ├── Program.cs                     logging, errors, sign-in checks, rate limits; adds each service in one line; Swagger UI in Development
│   ├── OpenApi/BearerSecurity.cs      describes the sign-in token in the contract (Swagger's "Authorize" button, padlocks)
│   ├── appsettings.json               settings for every environment
│   ├── appsettings.Development.json   laptop only: local database, dev signing key, code 123456, demo officer
│   └── Properties/launchSettings.json `dotnet run` listens on http://localhost:8000
├── Services/
│   ├── PlatformService/               GET /health, GET /languages: the smallest example of a service
│   ├── AuthService/                   sign-in with phone number + SMS code
│   │   ├── Features/                  one file per endpoint: RequestCode (POST /api/auth/code),
│   │   │                              VerifyCode (POST /api/auth/verify), GetMe (GET /api/me)
│   │   ├── Models/                    the JSON the app sends and receives
│   │   ├── Providers/Interfaces/      what the service needs from outside: code generator, SMS sender, token issuer
│   │   ├── Providers/Implementations/ how: random or fixed code, log-only SMS (Africa's Talking later), JWT tokens, code hashing
│   │   ├── Langs/en.json              the sign-in error messages, by key (other languages are more files)
│   │   ├── AuthOptions.cs             limits: code lifetime, resend wait, tries, token lifetime, rate limit
│   │   └── AuthServiceExtension.cs    AddAuthService(): registers all of the above
│   ├── (next)  FarmerService          POST /api/sync, GET /api/sync/changes, farmer details, duplicate phone check, photos
│   ├── (later) UssdService            POST /api/ussd: Africa's Talking callback, menu state machine, SMS
│   └── Libs/
│       ├── SharedLibrary/             used by every service
│       │   ├── ValueObjects/PhoneNumber.cs   "024 000 0001" -> "+233240000001"; rejects non-Ghana numbers
│       │   ├── Errors/                ApiException (fail with a status and a message key) + the handler that answers in the caller's language
│       │   ├── Messages/, Langs/      message lookup by key and language (X-Language header)
│       │   ├── Features/              IFeature: the "one class per endpoint" pattern
│       │   ├── Providers/             IClock (time, fakeable in tests), ISessionProvider (who is calling, in which language)
│       │   ├── Enums/                 Language, Channel, and every fixed choice in the registration form (FarmerEnums.cs)
│       │   ├── Security/Auth.cs       role names and token claim names
│       │   └── Helpers/               data masking for logs; BuildTime (skips secret checks while the build writes the API contract)
│       └── Data/                      the database
│           ├── Entities/              one class per table: AppUser, LoginCode, Farmer, Visit, Photo
│           ├── Persistence/AppDbContext.cs   class-to-table map: table names, lengths, indexes
│           ├── Migrations/            GENERATED by dotnet-ef: the SQL steps that create and change the tables
│           ├── DatabaseMigrator.cs    on start-up: apply migrations, then add demo accounts (if configured)
│           └── DatabaseOptions.cs     the "Database" and "Seed" settings
├── tests/                             one test project per code project; CI requires 70% line coverage in each
│   ├── Shared/                        [UnitTest]/[IntegrationTest] traits, ApiAssert, PostgresFixture (real PostgreSQL in Docker), TestClock
│   ├── SharedLibrary.Tests/  PlatformService.Tests/  AuthService.Tests/
│   └── Api.Tests/                     the whole API in memory: health, errors, sign-in over HTTP against a migrated, seeded database
├── openapi/agroconnect.json           GENERATED on dotnet build; committed, the contract the frontend reads
├── dotnet-tools.json                  local tools: dotnet-ef (run `dotnet tool restore` once)
├── Dockerfile                         multi-stage: sdk build, Debian-based aspnet runtime, non-root, port 8080
├── docker-compose.dev.yml             PostgreSQL on localhost:5433 (and optionally the API) for local work
└── Directory.Build.props / Directory.Packages.props / global.json / .editorconfig   shared build settings, package versions, SDK version, code style
```

**Where to find things:**
- **The code behind a URL:** search for the route text, e.g. `"/api/auth/verify"`. It is in one `Features/` file.
- **A table:** look in `Data/Entities/` for the columns and in `AppDbContext.cs` for the names and indexes. The SQL is in `Data/Migrations/`.
- **An error message:** search the key (e.g. `CODE_WRONG`) in the `Langs/*.json` files.

**Changing a table:**
1. Edit the entity.
2. From `backend/`, run `dotnet dotnet-ef migrations add <WhatChanged> --project Services/Libs/Data --startup-project APIs/agroconnect-api --output-dir Migrations`.
3. Restart the API; it applies the migration.

**Looking inside the local database:** connect any PostgreSQL client to `127.0.0.1` port `5433` (not `localhost`: on Windows it can resolve to IPv6 `::1` first, and Docker publishes the port on IPv4 only), database `agroconnect`, user `agroconnect`, password `agroconnect_dev` (laptop only). Or run `docker exec -it backend-db-1 psql -U agroconnect -d agroconnect`.

**Photos:** they follow ADR 0008. The API hands out a short-lived upload link and never streams photos, because the t3.micro has 1 GiB of RAM. On a laptop, until the S3 bucket exists, the link points at the API, which stores the file on disk.

---

## 5. DevOps files

See section 2 and [`deploy/README.md`](../deploy/README.md). Still to add with the DevOps lead: TLS (domain + Caddy/Let's Encrypt or CloudFront), `frontend/.env.example`, and a nightly Postgres backup script once the database exists.

---

## 6. `docs/` (where the marks for decisions live)

```
docs/
├── architecture.md           diagram + one paragraph per component
├── adr/                      one short "Architecture Decision Record" per choice the brief demands
│   └── 0001 ... 0019            see docs/README.md for the index
├── data-dictionary.md        every farmer field, type, why we collect it
├── ussd-menu.md              the menu tree in all 4 languages
├── consent-form.md           Data Protection Act 2012 consent wording
└── diagrams/                 .drawio files + exported PNGs
```

ADRs are short (Context / Decision / Alternatives / Consequences). They answer the brief's "choose and justify" list directly, and lecturers recognise them as industry practice.

---

## Commands you'll run (generators and installs only)

Versions: **Node.js 24 LTS** (Node 20 reached end of life in April 2026) and **.NET 10 SDK** (the current LTS; .NET 8 support ends November 2026). Check with `node -v` and `dotnet --list-sdks`. Why each library is chosen: see [`tech-choices.md`](tech-choices.md).


| Where | Command | Creates |
|---|---|---|
| repo root | `pip install pre-commit && pre-commit install` | git hooks (ADR 0018) |
| `frontend/` | `npm ci` | app dependencies |
| `frontend/` | `npm run dev` / `lint` / `format:check` / `test:ci` / `build` | local checks, same as CI |
| repo root | `mkdir backend`, then `cd backend` | backend folder |
| `backend/` | `dotnet new sln -n AgroConnect` and `dotnet new webapi` / `classlib` / `xunit` per project | backend boilerplate |
| `backend/` | `dotnet sln add …` and `dotnet add reference …` | wiring the layers |
| `frontend/` | `npm run gen:api` (to add once the OpenAPI file exists) | `src/api/schema.d.ts` |

Run these yourself from the folder shown.
