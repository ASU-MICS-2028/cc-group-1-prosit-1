# Project status and handoff

Living file: where the project stands right now. Update it at the end of every working session (what was done, what's next). Decisions themselves go in `adr/` and `decision-log.md`; this file only tracks progress.

_Last updated: 2026-10-04 (synced with the DevOps pipeline, ADR 0019)_

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
- Backend language settled: C# / ASP.NET Core 10 for the whole project (Java and Python compared in ADR 0013).

## Bernard's to-do right now
1. Install the hooks once: `pip install pre-commit && pre-commit install` (and `npm ci` in `frontend/` for the ESLint/Prettier hooks).
2. Push `feature/scaffold` and open a PR into `development`. It touches `.github/`, `deploy/` and Dockerfiles, so the DevOps lead must approve it.
3. With the DevOps lead: decide how to get **HTTPS** onto staging and production (domain + Caddy/Let's Encrypt, or CloudFront). Without it the service worker, camera and GPS do not work on the deployed app.

## Next steps (in order)
1. **Frontend foundation (remaining):** Vitest; a first-screen language picker with audio (`AudioPrompt`); `OfflineBanner`; real translations for tw/ee/dag.
2. **PWA:** configure `vite-plugin-pwa` (manifest, icons, Workbox caching, update prompt).
3. **Offline data:** Dexie schema (farmers, photos, outbox), client UUIDs, sync loop.
4. **Registration wizard:** react-hook-form + zod steps for the five profile sections; photo (lazy-loaded compression) + GPS.
5. **Backend in `backend/`:** ASP.NET Core 10 Minimal API, Domain/Application/Infrastructure/Api, EF Core + Npgsql, OpenAPI to `backend/openapi/agroconnect.json`; `frontend/` runs `openapi-typescript` to generate `frontend/src/api/schema.d.ts`. It needs `backend/Dockerfile` and a `/health` endpoint (ADR 0019), tests via coverlet.msbuild.
6. **USSD endpoint** (Africa's Talking sandbox) in the API.
7. **Infra (mostly DevOps lead):** TLS for both environments, GitHub Environment secrets and the two EC2 instances (`deploy/README.md`), later S3 + CloudFront for the PWA.
8. **Write-up:** architecture justifications for the lecturer, drawn from the ADRs.

## Open questions
- Team sign-off still needed on ADR 0006 (Postgres), 0007 (phone-number auth) and 0015 (security plan).
- Postgres hosting: RDS free tier vs Postgres in Docker on the EC2 instance (depends on credits).
- Week 4 AI scope: hosted models only (C# calls them) or self-trained models (separate Python service).
