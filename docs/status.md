# Project status and handoff

Living file: where the project stands right now. Update it at the end of every working session (what was done, what's next). Decisions themselves go in `adr/` and `decision-log.md`; this file only tracks progress.

_Last updated: 2026-10-07 (private network live: staging and production behind the load balancer; see infrastructure.md)_

## The assignment (Prosit 1, AgroConnect Ghana)
Ashesi ICS 534 Cloud Computing. A four-week build; we are building all four weeks into one product.

- **Week 1 (due ~2026-10-05), farmer registration and profiling:**
  - Installable, offline-capable PWA (service worker, manifest, HTTPS, background sync).
  - Farmer profile: personal details, farm details, technology access, financial info, extension-service history.
  - English, Twi, Ewe, Dagbani, plus recorded audio prompts (low literacy).
  - SMS/USSD for feature phones (Africa's Talking sandbox).
  - Photo + GPS capture.
  - Deployed to the cloud.
  - Written justification of: cloud provider, SQL vs NoSQL, phone vs national-ID auth, offline sync strategy, encryption/privacy.
- **Weeks 2-4:** multiple countries and currencies, weather, mobile money, AI features.
- **Week 1 grading:** 40% technical, 30% community engagement (Ashaiman farmers), 20% learning process, 10% teamwork.
- Primary users: Northern Ghana farmers on cheap Android phones and paid 2G, or feature phones (USSD). Farmers with no phone are registered by extension agents.

The brief (`Prosit 1-v2.docx`, `Prosit Launch 1.pptx`) and the Lab 1/Lab 2 reports are not in this repo; ask Bernard for them if needed.

## Done
- Repo created (`ASU-MICS-2028/cc-group-1-prosit-1`), branch `feature/scaffold`. Single-repo layout decided (ADR 0017); folders are `frontend/` and `backend/`.
- Vite 8 + React 19 + TypeScript 6 scaffold, ESLint in `frontend/`.
- React Compiler wired in `vite.config.ts` (Babel preset).
- Tailwind v4 via `@tailwindcss/vite`; `@/` path alias in `vite.config.ts` and both tsconfigs.
- shadcn/ui initialised: Base UI primitives, Nova preset, `components.json`, `src/lib/utils.ts` (uses shadcn's `cn` package), `src/components/ui/button.tsx`.
- Runtime libraries installed: dexie, dexie-react-hooks, i18next, react-i18next, react-hook-form, @hookform/resolvers, zod v4, react-router-dom, browser-image-compression, lucide-react; dev: vite-plugin-pwa.
- System font stack replaces Geist in `src/index.css`.
- Frontend foundation: Vite demo removed; AgroConnect green `--primary` theme (light and dark); router with lazy page chunks (`/`, `/register`, `/farmers`, `/farmers/:id`, `/settings`, 404) in `frontend/src/app/router.tsx`; layout with bottom nav; typed i18next (`frontend/src/i18n`) with English in the main bundle and tw/ee/dag as lazy chunks (currently empty `{}` files that fall back to English: translations must come from native speakers, ADR 0014); language picker remembered in localStorage. Initial JS is about 122 KB gzipped (budget 200 KB).
- `.gitignore`: `.env*` ignored except `.env.example`; `coverage` ignored.
- All decisions so far documented: `docs/adr/0001`-`0018`, `decision-log.md`, `tech-choices.md`, `project-structure.md`.
- Repo tooling (ADR 0018): pre-commit (gitleaks, hygiene, ESLint, Prettier), `.gitattributes`, Prettier config in `frontend/`.
- Tests: Vitest + Testing Library; 13 tests, ~98% line coverage (CI gate is 70%); `npm run test:ci`, `lint`, `format:check`, `build` and `npm audit --omit=dev` all pass.
- Frontend `Dockerfile` (node build, nginx-unprivileged on 8080), `.nginx/nginx.conf` (SPA fallback, cache headers, `/api` proxy to the backend container), `.dockerignore`. Not yet built locally (Docker Desktop was off); CI's docker job will build it.
- DevOps pipeline merged from `origin/development` and adapted: CI (`ci.yml`) now uses Node 24, a .NET backend job, `npm audit` and `format:check`; compose uses ASP.NET port 8080 and a bash health check; Dependabot covers npm, nuget, docker, actions; CODEOWNERS covers `frontend/.nginx/`. See ADR 0019.
- Backend scaffold (branch `feature/backend-scaffold`): service-based layout from the company repos (ADR 0020): thin API host in `backend/APIs/agroconnect-api`, `PlatformService` (GET /health, GET /languages) as the pattern for later services, `Libs/SharedLibrary` (enums, PhoneNumber, feature base, ApiException, language-keyed messages via X-Language, session provider, data masking, clock), `Libs/Data` (EF Core + PostgreSQL), tests per project plus `Api.Tests` with Testcontainers; central package versions; Serilog, problem details, OpenAPI to `backend/openapi/agroconnect.json`; Dockerfile (non-root) and `docker-compose.dev.yml`; 69 tests, 97% to 100% coverage; `dotnet format` hook and CI wiring. Verified: build, format, tests, coverage gate, container `/health` 200 with the database healthy.
- Backend language settled: C# / ASP.NET Core 10 for the whole project (Java and Python compared in ADR 0013).
- UI from Figma (branch `feature/ui-build`, ADR 0021): design tokens, first-run language screen (`/welcome`, preview then Continue), responsive shell (floating bottom bar on phones, sidebar from 768 px), Home / Farmers (search + sync filters) / Sync / Profile pages, status chips, farmer rows, audio buttons (recordings pending), dev-only component sheet at `/design`. Lists read from `useFarmers()`, empty until the offline store exists. 52 tests, 98.7% line coverage; initial JS about 125 KB gzipped.

- Database (branch `feature/ui-build`): five tables (`users`, `login_codes`, `farmers`, `visits`, `photos`) in the first EF Core migration (`InitialSchema`). The API applies migrations on start-up and, on a laptop, seeds a demo officer (Fuseini Alhassan, 024 000 0001) and a sample farmer (Ama Boateng, 024 000 1234). Every column is explained in `data-dictionary.md`.
- Sign-in (`AuthService`): `POST /api/auth/code`, `POST /api/auth/verify`, `GET /api/me`.
  - **Codes:** 6 digits, stored only as a hash, valid 10 minutes; one per 45 s and 5 per hour per phone; locked after 5 wrong tries.
  - **Tokens:** 7-day signed tokens (JWT) with the role (officer or farmer) (ADR 0022).
  - **Abuse limits:** 30 requests per 5 minutes per network address.
  - **Farmer accounts:** created on first sign-in.
  - **SMS:** written to the log until Africa's Talking is connected; the laptop code is always 123456.
  - **Tests:** 31, 99% coverage.
  - **Live check:** done against the local database.
- Database clean-up (ADR 0023): snake_case names (`full_name`) and six enforced links (foreign keys); the first migration was regenerated before anything was committed or deployed. A test proves the database refuses a visit for a farmer that does not exist.
- Backend tests: 109 in total; every test project above the 70% gate. A shared real-PostgreSQL test fixture (Testcontainers) and an end-to-end sign-in test over HTTP.
- PR #31 (sign-in, database, docs, UI foundation) merged into `development`.
- Start and sign-in screens from Figma (branch `feature/ui-implementation`): Welcome, Language, Who are you, Log in, Enter code, for officers and farmers.
  - Wired to the real API through a typed client generated from the OpenAPI contract (`npm run api:types`) and a Vite dev proxy (`/api` to `localhost:8000`).
  - Route guards: signed-out people see the start screens; officers get `/`; farmers get `/farmer`.
  - The sign-in is kept on the phone for 7 days.
  - Frontend tests: 72, 98.3% lines.
  - Checked live in headless Chrome against the API and database.
- Roles, accounts and devices decided (ADR 0024): three roles; admins add officers, officers register farmers; farmers phone only, officers phone and computer, admins computer only. *Who are you?* shows Extension officer / Farmer on a phone and Extension officer / MoFA admin on a computer (amended 2026-10-06). Designed in Figma (desktop *Who are you?*, farmer-on-a-computer, admin sign-in and code, *Add a person*, admin-on-a-phone), not built yet.
- Infrastructure live (ADR 0026, 2026-10-06/07): own VPC with private app and database subnets, fck-nat, one load balancer, Auto Scaling (production 2 to 4 servers, staging 1), images from ECR, RDS `agroconnect-prod` in private subnets, CloudWatch alarms by email, budget $100. Production runs `sha-1355e3e`, staging `sha-75c52f7`. Old servers and the old database are deleted. Details and runbook: `infrastructure.md`.
- Docs: `phase-1-overview.md` (replaces the concise PDF), `data-dictionary.md` (who is who, every table, column and code), `tech-choices.md` (the whole stack), `local-development.md` (every command, health checks, laptop vs servers), and `project-structure.md` (backend file guide).

## Bernard's to-do right now
1. Try the start screens yourself: `npm run dev` in `frontend/` with the API running (see `local-development.md` 5.5).
2. With the DevOps lead: HTTPS for staging and production, and the `Auth__SigningKey` secret on each server.
3. Share `docs/` with the team (Liza: `data-dictionary.md`; slides: `phase-1-overview.md`).

## Next steps (in order)
1. **Farmer service (backend):** `POST /api/sync` (farmers and visits, safe to resend), `GET /api/sync/changes`, farmer details, the duplicate phone check, photo upload links. Tests and a live check.
2. **Connect the app to the backend:** Vite dev proxy, API client typed from the OpenAPI contract, saved sign-in token.
3. **Offline engine:** Dexie (farmers, visits, photos, outbox), sync on open, on reconnect and with "Sync now".
4. **Screens from Figma:** sign-in, the 7-step registration, review and saved, farmer list and detail, edit, visits, the farmer's own view, help, sign-out, error, empty and offline states.
5. **Installable app:** manifest, icons, Workbox caching, update and install prompts.
6. **USSD and SMS** with the Africa's Talking sandbox.
7. **Infra (DevOps lead):** HTTPS (domain + ACM certificate on the load balancer), a staging host name. The private network, Auto Scaling, ECR, alarms and the photo buckets are live (`infrastructure.md`).
8. **Write-up and slides:** from `phase-1-overview.md` and the ADRs.
9. **Roles and devices (ADR 0024):** backend `admin` role, an endpoint for admins to add officers and admins (SMS invite), a first-admin script; frontend: *Who are you?* choices by screen width, admin sign-in, farmer-on-a-computer and admin-on-a-phone screens, the *Add a person* form.
10. **Pictures (ADR 0025):** export tile pictures as 160 px WebP outside the bundle, a Workbox cache-first rule for them, and the icon fallback when offline.

## Open questions
- Team sign-off still needed on ADR 0006 (Postgres), 0007 (phone-number auth) and 0015 (security plan).
- Postgres hosting: RDS free tier vs Postgres in Docker on the EC2 instance (depends on credits).
- Week 4 AI scope: hosted models only (C# calls them) or self-trained models (separate Python service).
- Sign-in: tokens last 7 days (ADR 0022); a "sign out everywhere" switch is still to design.
- Who may see which farmers: today each officer sees the farmers they registered; sharing within a district needs MoFA agreement.
