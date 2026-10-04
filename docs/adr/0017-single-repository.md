# ADR 0017: One repository (monorepo) with `web/` and `api/`

- **Status:** Accepted (Bernard, 2026-10-04; the team's final decision after switching back and forth). Supersedes [0003](0003-two-repositories.md).
- **Date:** 2026-10-04

## Context
0003 chose two repos for independent ownership and deployment. In practice the team is four people, Bernard builds both the PWA and the API, and the only thing the two halves share is the API contract. Two repos mean every feature that touches a field is two linked PRs, a committed OpenAPI file that must be copied or fetched across repos, and a second repo to set up, protect, add the lecturer to and keep CI secrets for. The frontend scaffold was still uncommitted, so moving it now costs almost nothing.

## Decision
One repo, `cc-group-1-prosit-1`, with one folder per deployable service and shared infra/docs at the root:

```
web/     the Vite React PWA (src/, public/, package.json, configs, Dockerfile, .nginx/)
api/     the ASP.NET Core 10 solution (src/, tests/, AgroConnect.sln, Dockerfile)
aws/  scripts/  docker-compose*.yml  .github/  docs/    shared, at the root
```

- **Contract:** the API still publishes OpenAPI (0013) to `api/openapi/agroconnect.json`; `web/` generates `src/api/schema.d.ts` from that path in the same checkout. A field rename breaks the web build in the same PR.
- **CI:** one workflow per service, with path filters (`web/**`, `api/**`). A docs-only change builds nothing.
- **Images:** each service still builds its own Docker image and pushes it to ECR with its own tag (`web-<sha>`, `api-<sha>`), so each can be deployed and rolled back on its own.
- **Branches:** unchanged (0004): `feature/*` → `development` → `uat` → `main`. A cross-cutting feature is one branch and one PR.
- **Ownership:** `CODEOWNERS` by folder (`web/`, `api/`, infra files, `docs/`).

## Alternatives considered
- **Two repos (0003):** better isolation at company scale, but its benefits (least privilege between teams, independent release trains) don't apply to four people, and its cost (linked PRs, contract drift) hits us every feature.
- **Monorepo tooling (Nx, Turborepo, pnpm workspaces):** not needed. Only one service is Node and the other is .NET, so they share no code; plain folders and path-filtered workflows are enough.
- **App at the repo root, API in `api/`:** least churn today, but it mixes Node config files with the whole repo and makes `web/` and `api/` asymmetric. Rejected for clarity.

## Consequences
- One clone, one PR per feature, one place to review the contract change and both sides of it.
- Least-privilege moves from the repo boundary to the pipeline: one OIDC role per workflow (`web-deploy`, `api-deploy`), limited to the `development`/`main` branches via the token's `sub` claim (see 0015).
- CI must use path filters and per-folder caching, or every PR will build everything.
- Anyone with write access can touch both services; `CODEOWNERS` and review rules (0004) are the guard.
- Independent rollback depends on per-service image tags, not on separate repos.
- Revisit if the API gets a different team, or if a Python AI service (0013) is added: that would be a third folder (`ml/`), still in this repo unless it needs its own release cycle or access list.
