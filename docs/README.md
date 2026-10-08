# AgroConnect documentation

Everything we decided, and why. Start with the decision records; each one answers a "choose and justify" item from the Prosit brief or a choice the team made while building.

## Contents
- [`study-manual.md`](study-manual.md): study guide: what labs 0 to 4 and the lectures taught, how each became part of AgroConnect, and how to build everything from scratch (Linux, Git, Docker, PostgreSQL, C#/.NET, React, CI/CD, AWS), with file names and commands explained.
- [`phase-1-overview.md`](phase-1-overview.md): Phase 1 in plain words (replaces the concise PDF): done, next, what is built, the tables, sign-in, sync, servers, risks. Kept up to date.
- [`data-dictionary.md`](data-dictionary.md): who is who (MoFA, officers, farmers, partners) and how they connect; every table and column, what the numbers mean (e.g. crops `{0,3}` = maize, groundnut), and useful queries.
- [`local-development.md`](local-development.md): hands-on guide: every Docker, dotnet and database command we use, what it does, health checks, and how the laptop maps to the cloud servers.
- [`status.md`](status.md): where the project stands now: done, next steps, open questions.
- [`decision-log.md`](decision-log.md): every decision in date order, one line each.
- [`infrastructure.md`](infrastructure.md): what runs in AWS right now (addresses, servers, database, alarms, cost), how to deploy and scale, and the migration log.
- [`adr/`](adr/): Architecture Decision Records (Context / Decision / Alternatives / Consequences). Copy `adr/template.md` for new ones.
- [`tech-choices.md`](tech-choices.md): the whole stack: every framework, library, package, container image and tool (frontend, backend, data, servers, checks), what it does, why we chose it and what we rejected.
- [`project-structure.md`](project-structure.md): the folder layout of the repository (`frontend/`, `backend/`, `deploy/`, docs) and what each file is for.

Still to write: `architecture.md` (diagram), `ussd-menu.md`, `consent-form.md`, `deploy.md`.

## Decision records
| # | Decision | Status |
|---|---|---|
| [0001](adr/0001-cloud-aws-af-south-1.md) | Cloud platform: AWS, Africa (Cape Town) af-south-1 | Accepted |
| [0002](adr/0002-single-pwa-plus-ussd.md) | One Progressive Web App, plus USSD for feature phones | Accepted |
| [0003](adr/0003-two-repositories.md) | Two repositories: frontend + DevOps, and backend | Superseded by 0017 |
| [0004](adr/0004-branching-and-cicd.md) | Branching strategy and CI/CD | Accepted |
| [0005](adr/0005-offline-first-sync.md) | Offline-first data with a local outbox | Accepted |
| [0006](adr/0006-postgres-over-nosql.md) | PostgreSQL for farmer data | Proposed |
| [0007](adr/0007-phone-number-auth.md) | Authentication by phone number | Proposed |
| [0008](adr/0008-photos-compressed-direct-to-s3.md) | Photos compressed on the phone and uploaded straight to S3 | Accepted |
| [0009](adr/0009-hosting-and-latency.md) | Hosting: S3 + CloudFront for the PWA, EC2 for the API | Accepted |
| [0010](adr/0010-frontend-libraries.md) | Frontend libraries | Accepted |
| [0011](adr/0011-ui-components-and-system-font.md) | UI: shadcn/ui on Base UI, Tailwind v4, system font | Accepted |
| [0012](adr/0012-react-compiler.md) | React Compiler | Accepted |
| [0013](adr/0013-backend-dotnet-openapi.md) | Backend: ASP.NET Core 10, OpenAPI contract | Accepted |
| [0014](adr/0014-languages-and-audio.md) | Languages and audio prompts | Accepted |
| [0015](adr/0015-security-and-privacy.md) | Security and privacy of farmer data | Proposed |
| [0016](adr/0016-runtime-versions.md) | Runtime versions | Accepted |
| [0017](adr/0017-single-repository.md) | One repository with `frontend/` and `backend/` | Accepted |
| [0018](adr/0018-git-hooks-and-commit-conventions.md) | Git hooks, formatting and commit conventions (pre-commit) | Accepted |
| [0019](adr/0019-devops-pipeline.md) | DevOps pipeline: GHCR, SSH deploy, staging and production | Accepted |
| [0020](adr/0020-backend-service-structure.md) | Backend structure: services as class libraries behind a thin API host | Accepted |
| [0021](adr/0021-ui-from-figma-design.md) | Building the UI from the Figma design: mobile first, responsive, system font | Accepted |
| [0022](adr/0022-sign-in-codes-and-tokens.md) | Sign-in details: SMS codes, 7-day tokens and limits | Accepted |
| [0023](adr/0023-database-naming-and-links.md) | Database naming (snake_case) and enforced links (foreign keys) | Accepted |
| [0024](adr/0024-roles-accounts-and-devices.md) | Roles, how accounts are made, and which device each role uses | Accepted, amended 2026-10-06 and 2026-10-07 |
| [0025](adr/0025-pictures-online-icons-offline.md) | Pictures load online; icons are the offline placeholder | Accepted |
| [0026](adr/0026-private-network-and-autoscaling.md) | Private network, fck-nat, load balancer and Auto Scaling | Proposed |
| [0027](adr/0027-registration-form-flow.md) | How the registration form works on the phone: steps, drafts, consent, duplicates | Accepted |
| [0028](adr/0028-installable-app-and-updates.md) | Installing the app, working offline, and updates (service worker) | Accepted |
| [0029](adr/0029-app-screens-and-sync-contract.md) | The Phase 1 app screens, their navigation, and the sync contract the app expects | Accepted |
| [0030](adr/0030-desktop-top-bar-and-account-menu.md) | A top bar and an account menu on computers | Superseded by its 2026-10-07 amendment (Figma sidebar) |
| [0031](adr/0031-farmer-services-with-sample-providers.md) | The farmer's app and farm services, built now with sample providers | Accepted |
| [0032](adr/0032-sync-service.md) | The sync service: how the server stores what officers saved offline | Accepted |
| [0033](adr/0033-mofa-admin-accounts-and-overview.md) | MoFA admin accounts, their area, and the Overview | Accepted |
| [0034](adr/0034-mobile-money-with-paystack.md) | Mobile money through Paystack | Accepted |
| [0035](adr/0035-help-requests.md) | Help requests from farmers to their officer | Accepted |
| [0036](adr/0036-speech-in-ghanaian-languages.md) | Speaker buttons in Twi, Ewe and Dagbani through GhanaNLP Khaya | Accepted |
| [0037](adr/0037-sms-through-arkesel.md) | SMS through Arkesel, safe by default | Accepted |
| [0038](adr/0038-ussd-through-arkesel.md) | USSD for simple phones, through Arkesel | Accepted |
| [0039](adr/0039-real-codes-with-a-backup-code.md) | Real sign-in codes, with a backup code for when SMS fails | Accepted |

**Proposed** means recommended but waiting for the owning team member to confirm.
