# AgroConnect documentation

Everything we decided, and why. Start with the decision records; each one answers a "choose and justify" item from the Prosit brief or a choice the team made while building.

## Contents
- [`status.md`](status.md): where the project stands now: done, next steps, open questions.
- [`decision-log.md`](decision-log.md): every decision in date order, one line each.
- [`adr/`](adr/): Architecture Decision Records (Context / Decision / Alternatives / Consequences). Copy `adr/template.md` for new ones.
- [`tech-choices.md`](tech-choices.md): why each frontend library is in (or out), with bundle-size reasoning.
- [`project-structure.md`](project-structure.md): the folder layout of the repository (`frontend/`, `backend/`, `deploy/`, docs) and what each file is for.

Still to write: `architecture.md` (diagram), `data-dictionary.md`, `ussd-menu.md`, `consent-form.md`, `deploy.md`.

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
| [0013](adr/0013-backend-dotnet-openapi.md) | Backend: ASP.NET Core 10, clean architecture, OpenAPI contract | Accepted |
| [0014](adr/0014-languages-and-audio.md) | Languages and audio prompts | Accepted |
| [0015](adr/0015-security-and-privacy.md) | Security and privacy of farmer data | Proposed |
| [0016](adr/0016-runtime-versions.md) | Runtime versions | Accepted |
| [0017](adr/0017-single-repository.md) | One repository with `frontend/` and `backend/` | Accepted |
| [0018](adr/0018-git-hooks-and-commit-conventions.md) | Git hooks, formatting and commit conventions (pre-commit) | Accepted |
| [0019](adr/0019-devops-pipeline.md) | DevOps pipeline: GHCR, SSH deploy, staging and production | Accepted |

**Proposed** means recommended but waiting for the owning team member to confirm.
