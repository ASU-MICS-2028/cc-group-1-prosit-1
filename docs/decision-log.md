# Decision log

| Date | Decision | Record |
|---|---|---|
| 2026-09-22 | AWS chosen as platform (familiarity; Azure within 1% on cost) | [0001](adr/0001-cloud-aws-af-south-1.md) |
| 2026-09-22 | Design first for Northern Ghana Farmers Network: basic phones, 2G, low literacy, Dagbani | [0002](adr/0002-single-pwa-plus-ussd.md), [0014](adr/0014-languages-and-audio.md) |
| 2026-09-27 | af-south-1 confirmed by latency test; t3.micro; stateless VM, data in Postgres + S3 | [0001](adr/0001-cloud-aws-af-south-1.md), [0006](adr/0006-postgres-over-nosql.md) |
| 2026-10-04 | One PWA plus USSD; no native app, no microfrontends | [0002](adr/0002-single-pwa-plus-ussd.md) |
| 2026-10-04 | Branch flow feature → development → staging → main; GitHub Actions (amended by 0019) | [0004](adr/0004-branching-and-cicd.md) |
| 2026-10-04 | Two repos: frontend + DevOps (MTN-style root layout) and backend | [0003](adr/0003-two-repositories.md) |
| 2026-10-04 | Reversed 0003 (final): one repo with `frontend/` and `backend/` folders, path-filtered CI, per-service images | [0017](adr/0017-single-repository.md) |
| 2026-10-04 | One hook system: pre-commit (replaces husky/commitlint); imperative commit messages | [0018](adr/0018-git-hooks-and-commit-conventions.md) |
| 2026-10-04 | Adopted the DevOps lead's pipeline: GHCR, SSH deploy, separate staging and production EC2; backend confirmed C#; Node 24 and .NET 10 in CI; 70% coverage gate | [0019](adr/0019-devops-pipeline.md) |
| 2026-10-04 | Offline-first with Dexie outbox, phone-generated IDs, newest-wins conflicts | [0005](adr/0005-offline-first-sync.md) |
| 2026-10-04 | Photos compressed on phone, uploaded to private S3 via presigned URL | [0008](adr/0008-photos-compressed-direct-to-s3.md) |
| 2026-10-04 | PWA on S3 + CloudFront (HTTPS, Lagos edge); API via CloudFront to EC2 | [0009](adr/0009-hosting-and-latency.md) |
| 2026-10-04 | Frontend library set fixed; Redux, moment, TanStack Query left out | [0010](adr/0010-frontend-libraries.md) |
| 2026-10-04 | API contract via OpenAPI → openapi-typescript | [0013](adr/0013-backend-dotnet-openapi.md) |
| 2026-10-04 | Node 24 LTS and .NET 10 LTS (corrected from Node 20 / .NET 8); zod v4 | [0016](adr/0016-runtime-versions.md) |
| 2026-10-04 | shadcn/ui with Base UI (over Radix), Nova preset, Tailwind v4 | [0011](adr/0011-ui-components-and-system-font.md) |
| 2026-10-04 | React Compiler enabled via Babel preset | [0012](adr/0012-react-compiler.md) |
| 2026-10-04 | Geist web font replaced with system font stack | [0011](adr/0011-ui-components-and-system-font.md) |
| 2026-10-04 | `.env` files git-ignored; `.env.example` is the template | [0015](adr/0015-security-and-privacy.md) |
| 2026-10-04 | C# confirmed as backend for all four weeks; any self-trained AI models go in a separate Python service | [0013](adr/0013-backend-dotnet-openapi.md) |
| 2026-10-04 | Backend restructured from Clean Architecture layers to service class libraries behind a thin API host (company layout, own feature base) | [0020](adr/0020-backend-service-structure.md) |
| 2026-10-04 | UI built from the AgroConnect Figma frames (marketplace template frames not built); responsive bottom bar to sidebar; system font kept | [0021](adr/0021-ui-from-figma-design.md) |
| 2026-10-05 | Sign-in rules: 6-digit SMS code valid 10 min (45 s resend, 5 per hour, 5 tries), hashed storage, 7-day tokens, 30 requests per 5 min per address | [0022](adr/0022-sign-in-codes-and-tokens.md) |
| 2026-10-05 | Database names in snake_case; links between tables enforced with foreign keys (photo links checked by the API) | [0023](adr/0023-database-naming-and-links.md) |
| 2026-10-05 | Phone vs desktop: one app at one URL; the screen width picks the layout (desktop from Tailwind md, 768 px), the signed-in role picks menus and routes; no device detection, no blocked pages ("easier on a computer" notice instead) | Team decision note "AgroConnect: Phone vs Desktop" |
| 2026-10-05 | Own VPC in two zones with private app and database subnets, fck-nat instead of a NAT Gateway, one load balancer, Auto Scaling (production 2 to 4, staging 1), S3 HTTPS-only with restricted CORS | [0026](adr/0026-private-network-and-autoscaling.md) |
| 2026-10-06 | Amended 0024: *Who are you?* shows Extension officer / Farmer on a phone and Extension officer / MoFA admin on a computer; the separate `/admin` page is dropped | [0024](adr/0024-roles-accounts-and-devices.md) |
| 2026-10-07 | ADR 0026 applied: staging and production run in the private network behind the load balancer (production 2 to 4 servers); images from ECR; old database deleted | [0026](adr/0026-private-network-and-autoscaling.md), [infrastructure.md](infrastructure.md) |
| pending | Postgres vs NoSQL, phone-number auth, security plan: awaiting team confirmation | [0006](adr/0006-postgres-over-nosql.md), [0007](adr/0007-phone-number-auth.md), [0015](adr/0015-security-and-privacy.md) |
