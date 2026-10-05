# AgroConnect stack: every framework, library and tool, and why

This is the one place that lists **everything** we use: the platform, the frontend, the backend, the database, containers and servers, and the tools that check our work. For each one it gives what it does, why we chose it, and what we rejected. The big decisions also have their own ADR in [`adr/`](adr/), linked below.

**The rule behind all of it: the farmer pays for every kilobyte** (paid 2G data, cheap Android phones). A library earns its place only if it does something hard that we would otherwise get wrong. On the server the same rule becomes: **the server is small** (an EC2 t3.micro with 1 GiB of RAM), so we prefer what the framework already includes over extra packages.

_Last updated: 5 October 2026. Versions are the ones installed today (`npm ls`, `Directory.Packages.props`)._

---

## 1. The stack at a glance

| Layer | What we use |
|---|---|
| **Design** | Figma (mobile first, responsive), system font, our own design tokens |
| **App on the phone** | React 19 PWA, TypeScript 6, Vite 8, Tailwind 4, shadcn/ui on Base UI, react-router 7, react-hook-form + zod, i18next, Dexie (IndexedDB), Workbox via vite-plugin-pwa |
| **Simple phones** | USSD and SMS through Africa's Talking (planned) |
| **Backend** | C# on .NET 10 (ASP.NET Core Minimal APIs), EF Core 10 + Npgsql, JWT tokens, Serilog, built-in OpenAPI |
| **Database** | PostgreSQL 17 (container on laptop and staging; RDS planned for production) |
| **Photos** | Private S3 bucket with short-lived upload links (planned; disk on a laptop) |
| **Containers** | Docker, Docker Compose, nginx (unprivileged) |
| **Cloud** | AWS af-south-1 (Cape Town), EC2 Ubuntu 24.04, GHCR for images |
| **Delivery** | GitHub Actions (CI and deploy), Dependabot |
| **Quality** | Vitest + Testing Library, xUnit + Testcontainers + NSubstitute, coverlet, ESLint, Prettier, dotnet format, pre-commit, gitleaks |

---

## 2. The big platform choices

| Choice | Why | Rejected | ADR |
|---|---|---|---|
| **AWS, Cape Town (af-south-1)** | The team knows AWS (a stated bias). Cape Town answers Accra in 116 to 136 ms, Ireland in 166 to 178 ms. Price within 1% of Azure. | Azure (no technical edge), Google Cloud (needed a deposit), Ireland (slower) | [0001](adr/0001-cloud-aws-af-south-1.md) |
| **One installable web app (PWA) plus USSD** | No app store, one codebase, works on old Android phones; USSD reaches the 1 in 4 farmers with simple phones. The brief asks for a PWA. | Native Android, React Native, Flutter (store install, bigger downloads, a second codebase) | [0002](adr/0002-single-pwa-plus-ussd.md) |
| **Offline first with an outbox** | Officers work without signal. Save on the phone, send later; IDs made on the phone so a resend never duplicates. | Online-only forms (lose data in the field) | [0005](adr/0005-offline-first-sync.md) |
| **PostgreSQL** | Farmer data is linked (farmers, visits, photos, users) and must never be half saved (transactions). Arrays and JSON when useful. Managed version (RDS) exists. | MongoDB, DynamoDB (weaker for cross-record questions MoFA will ask) | [0006](adr/0006-postgres-over-nosql.md) |
| **Sign in with phone number + SMS code** | Everyone has a number; not everyone has a Ghana Card or remembers a password. | Passwords, Ghana Card (needs agreements) | [0007](adr/0007-phone-number-auth.md) |
| **Photos shrunk on the phone, uploaded straight to S3** | About 95% less data; photos never load the small server. | Uploading full size; streaming through the API | [0008](adr/0008-photos-compressed-direct-to-s3.md) |
| **C# / .NET 10 backend** | Strong typing, 80 to 150 MB of memory, built-in API description, excellent database tools, supported to November 2028. | Java (250 MB+), Python (slower, weaker typing), Node (fine, but we wanted one strongly typed server language for Weeks 2 to 4) | [0013](adr/0013-backend-dotnet-openapi.md) |
| **One repository** | Four people, four days: one set of checks, and a frontend + backend change lands in one PR. | Two repositories (superseded) | [0017](adr/0017-single-repository.md) |
| **Services inside one backend** | One deploy and easy testing now; each area is its own project, so splitting later follows existing lines. | Microservices now (more servers, tools and people than we have) | [0020](adr/0020-backend-service-structure.md) |
| **Docker + Compose on EC2, images in GHCR, deploy over SSH** | Simple, cheap, the same containers everywhere. Separate staging and production servers. | Kubernetes (about $73 a month just for the control plane), one shared server | [0019](adr/0019-devops-pipeline.md) |
| **UI from the Figma design, system font** | One agreed design; no web font download. | Web fonts (Poppins in Figma), a ready-made UI kit | [0011](adr/0011-ui-components-and-system-font.md), [0021](adr/0021-ui-from-figma-design.md) |

---

## 3. Frontend (`frontend/`)

### 3.1 Shipped to the phone (`dependencies`)

These are what the farmer downloads, so each one is weighed against its size.

| Package | Version | What it does | Why this one |
|---|---|---|---|
| `react`, `react-dom` | 19.3.0 | Builds the screens from components | The team knows it, huge ecosystem, works with the React Compiler |
| `react-router-dom` | 7.18.4 | Pages and links (`/farmers`, `/register`...) | Standard; each page is lazy-loaded so the first screen stays small (3.3) |
| `react-hook-form` | 7.89.0 | Form state for the 7-step registration | Typing does not redraw the whole form on a slow phone (3.3) |
| `zod` | 4.6.5 | Validation rules (phone format, required fields) | One rule gives both the check and the TypeScript type; v4 is smaller and faster (3.3) |
| `@hookform/resolvers` | 5.9.1 | Connects zod rules to react-hook-form | The official bridge |
| `i18next`, `react-i18next` | 26.4.2, 17.0.15 | Translations, one language file loaded at a time | Falls back to English when a word is missing (3.3) |
| `dexie` | 4.4.6 | The phone's database (IndexedDB) for farmers, visits, photos and the outbox | Makes IndexedDB usable: schema versions, indexes, transactions (3.3) |
| `dexie-react-hooks` | 4.4.0 | `useLiveQuery`: screens update when local data changes | Official Dexie hook |
| `browser-image-compression` | 2.0.2 | Shrinks a 3 to 5 MB photo to about 150 KB on the phone | Runs off the main thread and fixes photo rotation; lazy-loaded (3.3) |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.3 | Styling with utility classes | Only the classes we use ship (about 5 KB of CSS) |
| `@base-ui/react` | 1.8.0 | Accessible building blocks (dialogs, menus, focus handling) under shadcn | Keyboard and screen reader support done right (3.3) |
| `class-variance-authority` | 0.7.1 | Defines component variants (button sizes and colours) | What shadcn components use; tiny |
| `cn` | 0.4.0 | Joins and de-duplicates CSS class names | shadcn's helper |
| `tw-animate-css` | 1.4.0 | Small animation classes (open and close of dialogs) | What shadcn components expect; CSS only |
| `lucide-react` | 1.52.0 | Generic icons (chevron, check, speaker) | Each icon is imported on its own, so only used icons ship. Design icons come from Figma as SVG files in `public/icons/` |

### 3.2 Tools for building and testing (`devDependencies`, never shipped)

| Package | Version | What it does |
|---|---|---|
| `vite` | 8.3.2 | Dev server and production build (bundling, code splitting, hashing file names for caching) |
| `@vitejs/plugin-react` | 6.1.1 | React support in Vite (JSX, fast refresh) |
| `babel-plugin-react-compiler`, `@babel/core`, `@rolldown/plugin-babel` | 1.0.0, 7.29.7, 0.2.4 | Run the **React Compiler** during the build: it adds memoisation automatically, so cheap phones redraw less ([ADR 0012](adr/0012-react-compiler.md)) |
| `typescript` | 6.0.3 | Type checking: catches wrong fields and missing cases before running |
| `vite-plugin-pwa` | 2.0.0 | Generates the service worker (Workbox) and the install manifest (3.3) |
| `openapi-typescript` | 7.13.0 | Generates TypeScript types from the backend's `openapi/agroconnect.json`, so a renamed field breaks the build instead of the phone (3.3) |
| `shadcn` | 4.21.1 | The CLI that copies a component's source into `src/components/ui/`. Dev only: its audit warnings do not reach users ([ADR 0015](adr/0015-security-and-privacy.md)) |
| `vitest`, `@vitest/coverage-v8` | 5.0.3 | Test runner using the same Vite config; measures coverage for the 70% gate |
| `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | 16.3.3, 14.6.7, 7.0.1 | Tests that act like a user: find by label, click, type, check what is visible |
| `jsdom` | 30.1.2 | A browser simulated in Node, so tests run without opening Chrome |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals` | 10.12.0, 10.0.1, 8.71.0, 7.1.1, 0.5.7, 17.13.0 | Lint rules: common bugs, React hook mistakes, unsafe TypeScript |
| `prettier` | 3.9.9 | One formatting style, enforced in the hook and CI |
| `@types/react`, `@types/react-dom`, `@types/node`, `@types/babel__core` | | Type definitions for the libraries above |

The `overrides` block in `package.json` makes `openapi-typescript` use our TypeScript 6 instead of installing an older copy.

### 3.3 Why the main frontend libraries, in depth

Each pick answers four questions: **why this**, **what we rejected**, **what it costs the farmer** (download on 2G), and **what changes at scale**.

#### React 19 + React Compiler
- **Why:** the team knows React, the ecosystem is the largest (shadcn, testing tools, i18next bindings), and the React Compiler removes the main performance trap on cheap phones: needless redraws.
- **Rejected:**
  - Vue, Svelte, Solid: smaller ecosystems, new to the team.
  - Angular: heavy first download.
  - Next.js: built around a server, which we do not want for an offline app.
- **At scale:** stays. The micro-frontend plan after Phase 1 (overview section 10) also uses React.

#### TypeScript 6 + Vite 8 + Node 24 LTS
- **Why:**
  - TypeScript catches mistakes before they reach a phone.
  - Vite starts instantly and its production build splits code per page.
  - Node 24 is the LTS line, supported into 2028. It is pinned with `.nvmrc` and the `engines` field, because some laptops run Node 26.
- **Rejected:**
  - Plain JavaScript: errors show up on the phone, not on the laptop.
  - webpack: slower, more config.
  - Create React App: retired.

#### vite-plugin-pwa (Workbox underneath)
- **Why:** generates the service worker and manifest from config, with Google's Workbox doing the caching. Hand-written service workers are the number one source of "users stuck on an old version" bugs.
- **Rejected:** hand-writing `sw.js` (the brief's sample). Fine for learning, risky in production: cache versioning and the update flow are easy to get wrong.
- **Cost to farmer:** small; the service worker is one file loaded once.
- **At scale:** stays. For custom logic (e.g. background photo upload) we switch to its `injectManifest` mode, without changing tools.

#### Dexie (IndexedDB)
- **Why:** offline first is a brief requirement. IndexedDB is the only browser storage big enough for photos and structured enough to query. Dexie makes it usable (schema versions, indexes, transactions), and `useLiveQuery` makes the screens react to local changes.
- **Rejected:**
  - `localStorage`: 5 MB, text only, blocks the screen.
  - `idb`: tiny but low level; we would rebuild what Dexie gives.
  - RxDB, PowerSync, ElectricSQL: powerful, but heavier and add a vendor or server part we do not need in Week 1.
- **At scale:** our outbox is the same pattern those sync engines use. If conflicts get complex, we can move to one without changing the screens.

#### i18next + react-i18next
- **Why:** the most used React translation stack. It handles:
  - fallbacks: a missing Dagbani word shows English, never a blank
  - plurals
  - loading one language at a time, so a Twi speaker never downloads Ewe text.
- **Rejected:**
  - `react-intl` (FormatJS): its ICU message syntax is harder for non-developer translators.
  - Hand-rolled JSON lookups: no fallbacks or lazy loading.
- **At scale:** adding Yoruba and Swahili in Week 2 means adding two JSON files.
- **Honest caveat:** no library translates for us. Twi, Ewe and Dagbani must come from native speakers, and the audio is recorded by people.

#### react-hook-form + zod (+ @hookform/resolvers)
- **Why:**
  - react-hook-form keeps inputs uncontrolled, so typing does not redraw the whole form on a slow phone.
  - Zod defines each rule once (Ghana phone format, required fields, farm size above 0) and gives the TypeScript type from the same rule.
- **Rejected:**
  - Formik: redraws more, less maintained.
  - Yup: weaker TypeScript types.
- **Version:** zod v4 is faster and smaller than v3, and `zod/mini` exists if size gets tight.
- **At scale:** the server checks everything again on its side (never trust the client).

#### browser-image-compression
- **Why:** a phone photo is 3 to 5 MB; on 2G that is minutes and real money. Shrinking it to about 150 KB on the phone is the single biggest data saving in the app. The library runs in a Web Worker (the screen stays responsive) and fixes photo rotation from EXIF data, a classic bug.
- **Rejected:**
  - Uploading full size and resizing on the server: the farmer has already paid for the upload.
  - Our own canvas resize: possible, but we would also have to handle rotation and threading.
- **Cost to farmer:** lazy-loaded, downloaded only when someone opens the camera step.

#### shadcn/ui (Base UI + Tailwind)
- **Why:** components are copied into our code, not installed, so we ship only what we use and can change anything. Base UI underneath gives keyboard and screen reader accessibility.
- **Why Base UI rather than Radix:** Base UI is shadcn's recommended default and is actively developed by the people behind Radix, MUI and Floating UI, while Radix development has slowed. The only API difference you will notice is a `render` prop where Radix used `asChild`.
- **Rejected:**
  - MUI and Ant Design: large bundles, and hard to make simple for low-literacy users.
  - Building from scratch: accessibility is easy to get wrong.

#### react-router-dom
- **Why:** standard, known by the team, and lazy-loads each page.
- **Rejected:** TanStack Router (better type safety, but new to the team with no Week 1 payoff).

#### openapi-typescript
- **Why:** the biggest risk between `frontend/` and `backend/` is disagreeing about a field. Types generated from the API's contract turn that into a build error before deploy.

#### Vitest + Testing Library + jsdom
- **Why:**
  - Unit tests and a 70% line coverage gate are mandatory in CI.
  - Vitest reuses the Vite config, so there is no second toolchain.
  - Testing Library tests what the user sees, not how it is built.
- **Coverage:** excludes copied shadcn components, `main.tsx` and type files. `npm run test:ci` writes `coverage/coverage-summary.json`, which CI reads.

### 3.4 Left out on purpose

| Left out | Why |
|---|---|
| Redux | Local data lives in Dexie; server data comes through sync. A third store adds weight and bugs. |
| TanStack Query | Not needed while screens read from Dexie. Add it for online-only screens (market prices in Week 2). |
| moment.js | Large and in maintenance mode; the browser's `Intl` formats dates in every locale for free. |
| Web fonts (Poppins from Figma) | An extra download on every first visit; the system font looks native and costs nothing. |
| Module Federation / micro-frontends | Extra round trips and harder offline caching now; planned after Phase 1. |
| React Native / Flutter | App store install, bigger downloads, a second codebase. |

### 3.5 The size budget
- Initial JavaScript **under about 200 KB gzipped**. Today about 125 KB, checked in the `vite build` output.
- Everything not on the first screen is lazy-loaded: pages, the camera and compression, and languages other than English.
- Illustrations from Figma are optimised SVG files loaded with `<img loading="lazy">`, not bundled.

---

## 4. Backend (`backend/`)

### 4.1 What .NET 10 gives us without extra packages

A lot of what other stacks add as libraries is already inside ASP.NET Core. Using it keeps the server small and avoids licence surprises.

| Built-in feature | What we use it for |
|---|---|
| **Minimal APIs** | Each endpoint is one small handler (`app.MapPost("/api/auth/code", Handle)`) without controller classes |
| **Dependency injection** | Features ask for what they need (`AppDbContext`, `IClock`, `ISmsSender`) and tests pass in fakes |
| **Configuration and options** | `appsettings*.json` plus environment variables (`Auth__SigningKey`), bound to classes like `AuthOptions`, validated at start-up |
| **Problem details (RFC 9457)** | One standard JSON shape for every error |
| **Authentication and authorization** | Checking the JWT on each request and the "officer" or "farmer" role |
| **Rate limiting** | At most 30 sign-in requests per network address every 5 minutes |
| **Health checks** | `/health`, which also checks the database |
| **System.Text.Json** | JSON, with enums written as text (`"officer"`, `"maize"`) |
| **Cryptography** | `RandomNumberGenerator` for codes, `HMACSHA256` to hash them, constant-time comparison |
| **Forwarded headers** | Reading the real client address behind nginx |

### 4.2 Packages (all versions live in `backend/Directory.Packages.props`)

| Package | Version | Used by | What it does |
|---|---|---|---|
| `Microsoft.AspNetCore.OpenApi` | 10.0.12 | API host | Describes every endpoint as OpenAPI (the contract) |
| `Microsoft.Extensions.ApiDescription.Server` | 10.0.12 | API host (build only) | Writes that contract to `openapi/agroconnect.json` on every build |
| `Serilog.AspNetCore` | 10.0.0 | API host | Structured logs: readable on a laptop, JSON on servers (Docker collects stdout) |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | 10.0.12 | AuthService | Reads and checks the sign-in token on each request; also brings the token-writing library |
| `Npgsql.EntityFrameworkCore.PostgreSQL` | 10.0.3 | Data | EF Core's PostgreSQL driver, including arrays (crops stored as `integer[]`) |
| `Microsoft.EntityFrameworkCore.Design` | 10.0.12 | API host (dev only) | What `dotnet-ef` needs to generate migrations |
| `Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore` | 10.0.12 | Data | The "can I reach the database?" check behind `/health` |

Why these:
- **EF Core 10 + Npgsql:** tables as C# classes, generated migrations, safe queries without hand-written SQL. Npgsql is the standard PostgreSQL driver for .NET.
  - **Rejected:** Dapper (fast, but we would hand-write SQL and migrations); raw ADO.NET.
- **JWT (signed tokens):** the server does not need to look anything up on each request, and the token works while the phone is offline for days.
  - **Rejected:** ASP.NET Identity (built around passwords and cookies) and Duende IdentityServer (a full identity server with a paid licence) are too much for phone + SMS code.
- **Serilog:** structured logs with masking of personal data.
  - **Rejected:** plain console logging (harder to search on a server).

### 4.3 Test packages

| Package | Version | What it does |
|---|---|---|
| `xunit`, `xunit.runner.visualstudio`, `Microsoft.NET.Test.Sdk` | 2.9.3, 3.1.5, 18.10.1 | The test framework and runner (`dotnet test`) |
| `Testcontainers.PostgreSql` | 4.15.0 | Starts a real throwaway PostgreSQL in Docker for each test run |
| `Microsoft.AspNetCore.Mvc.Testing` | 10.0.12 | Runs the whole API in memory so tests call it over HTTP |
| `NSubstitute` | 6.2.0 | Fakes for things we do not want to call for real (the SMS sender) |
| `coverlet.msbuild` | 10.1.0 | Measures coverage and fails the run under 70% (the CI gate) |

Why these:
- **A real PostgreSQL, not SQLite or an in-memory fake:** fakes hide real behaviour such as arrays, indexes, time zones and migrations.
- **NSubstitute over Moq:** in 2023 Moq added a component that collected developer email data (SponsorLink), which damaged trust. NSubstitute is clean and simple.
- **xUnit v2:** works directly with `coverlet.msbuild`, which the CI coverage gate uses. v3 runs tests as a separate program and needs a different coverage setup; an upgrade for later.

### 4.4 Our own small building blocks instead of libraries

| Ours | Instead of | Why |
|---|---|---|
| `IFeature` (one class per endpoint) | MediatR | MediatR moved to a paid licence in 2025; our version is about 30 lines |
| Hand-written `MeResponse.From(user)` style mapping | AutoMapper | Paid licence in 2025, and explicit mapping is easier to read and debug |
| `ApiException` + handler + `Langs/*.json` | exceptions per error type, resource files | One way to fail, with the message in the caller's language |
| `PhoneNumber` | libphonenumber | We only need Ghana numbers; 70 lines, fully tested |
| `xUnit Assert` + `ApiAssert` | FluentAssertions | FluentAssertions v8 moved to a paid licence in 2025 |
| Validation inside each feature | FluentValidation | Few rules so far; we can add it if the sync validation grows |

### 4.5 Build settings that keep code clean (`backend/Directory.Build.props`, `.editorconfig`)
- **`TreatWarningsAsErrors`:** any compiler or analyzer warning fails the build, so problems cannot pile up.
- **`AnalysisLevel latest` + `EnforceCodeStyleInBuild`:** Microsoft's newest code-quality rules, and the `.editorconfig` style rules, run on every build.
- **`Nullable enable`:** the compiler tracks what can be null, which avoids the most common crash.
- **`InvariantGlobalization`:** a smaller, more predictable runtime (no culture surprises in dates and numbers).
- **Central package management:** every version is in one file, so all projects use the same one.

---

## 5. Data and storage

| Piece | Where | Why |
|---|---|---|
| **PostgreSQL 17** (`postgres:17-alpine` image) | Laptop and staging in a container; production on RDS (planned) | Supported to November 2029. Moving to 18 is a version bump once RDS in Cape Town offers it and our tests pass on it. |
| **EF Core migrations** | `backend/Services/Libs/Data/Migrations/` | Database changes are versioned in Git and applied when the API starts |
| **IndexedDB via Dexie** | On the phone | The offline store and the outbox |
| **Amazon S3** (planned) | One private bucket per environment | Photos, through short-lived upload links ([ADR 0008](adr/0008-photos-compressed-direct-to-s3.md)) |

---

## 6. Containers, servers and delivery

**Container images we build on:**

| Image | Used for | Why |
|---|---|---|
| `postgres:17-alpine` | The database (laptop, staging, tests) | Official, small (Alpine Linux) |
| `mcr.microsoft.com/dotnet/sdk:10.0` | Building the backend (build stage only) | Official .NET build tools |
| `mcr.microsoft.com/dotnet/aspnet:10.0` | Running the backend | Runtime only (no compiler), non-root user. Debian based, because the server health check uses bash. |
| `node:24-alpine` | Building the frontend (build stage only) | Same Node version as development |
| `nginxinc/nginx-unprivileged:stable-alpine` | Serving the app and passing `/api` on | nginx running as non-root, on port 8080 |

**Servers and delivery:**

| Tool | What it does | Why |
|---|---|---|
| **Docker + Docker Compose** | Packages each program; starts the set together on each server | The same container runs on a laptop, in CI and on EC2 |
| **nginx** | Serves the app files; passes `/api/*` to the backend; sets caching rules | One address for app and API (no CORS); fast static files |
| **EC2, Ubuntu 24.04 LTS** | The staging and production servers | Lab 2 sizing (t3.micro, maybe t3.small for production); long-term support |
| **GHCR** (GitHub Container Registry) | Stores our images, tagged `sha-<commit>` | Built into GitHub; no AWS keys needed in CI |
| **GitHub Actions** | `ci.yml` checks every PR; `deploy.yml` builds once and deploys | Free for the course; next to the code |
| **Actions we use** | `actions/checkout`, `setup-node`, `setup-dotnet`, `setup-python`, `cache`, `upload-artifact`, `dorny/paths-filter` (only check what changed), `docker/setup-buildx-action`, `docker/login-action`, `docker/build-push-action` | Official or widely used actions |
| **Dependabot** | Weekly pull requests to update npm, NuGet, Docker and Actions versions | Known security fixes arrive without anyone remembering |
| **Caddy** (planned) | HTTPS with free, self-renewing certificates | The PWA, GPS and camera need HTTPS |

Rejected: Kubernetes (about $73 a month for the control plane), ECS/Fargate (more AWS setup than four days allow), one shared server for test and live (a load test could take down the live app). The full reasoning is in [ADR 0019](adr/0019-devops-pipeline.md).

---

## 7. Tools that check our work

| Tool | When it runs | What it catches |
|---|---|---|
| **pre-commit** ([ADR 0018](adr/0018-git-hooks-and-commit-conventions.md)) | Before every commit on your laptop, and again in CI | Everything below, before it reaches GitHub |
| **gitleaks** | pre-commit and CI | Passwords, keys and tokens accidentally added to a commit |
| **pre-commit-hooks** | pre-commit | Trailing spaces, missing final newline, broken YAML or JSON, merge conflict markers, large files, private keys, commits straight to protected branches |
| **ESLint + Prettier** | pre-commit and CI | Frontend bugs and formatting |
| **dotnet format** | pre-commit and CI | Backend formatting and style |
| **npm audit** (`--omit=dev`) | CI | Known vulnerabilities in what ships to phones |
| **Coverage gates** | CI | Less than 70% of lines tested, frontend or any backend test project |

---

## 8. Outside services

| Service | Use | Status |
|---|---|---|
| **Africa's Talking** | SMS sign-in codes, USSD menus, confirmation texts | Planned; on a laptop the SMS goes to the log |
| **Figma** | The UI design: the source for every screen, icon and illustration | In use |
| **GitHub** | Code, pull requests, CI, images (GHCR) | In use |

---

## 9. Versions, and why these

| What | Version | Why |
|---|---|---|
| Node | 24 LTS (`.nvmrc`, `engines`) | LTS into 2028; Node 20 ended April 2026. Laptops on Node 26 still build the same. |
| npm | 11.16 | Comes with current Node |
| .NET SDK | 10.0.401 (`global.json`, rolls forward to newer feature bands) | .NET 10 is LTS to November 2028; .NET 8 ends November 2026 |
| PostgreSQL | 17 | Section 5 |
| Ubuntu | 24.04 LTS | Supported to 2029; 22.04 listings were paid bundles |

---

## 10. Adding a new library: the checklist

Before adding any package, answer these in the PR description:
1. **What hard thing does it do** that we would otherwise get wrong?
2. **What does it cost?** For the frontend, the gzipped size and whether it can be lazy-loaded. For the backend, memory and start-up time.
3. **Is it already built in?** (The browser's `Intl`, .NET's rate limiter, and so on.)
4. **Licence and health:** an open licence with no paid tier for our use, recent releases, more than one maintainer.
5. **How do we remove it later** if it goes wrong?

Then add it to this file (and an ADR if it is a big choice).
