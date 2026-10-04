# ADR 0019: DevOps pipeline: GitHub Actions, GHCR, SSH deploy, separate staging and production

- **Status:** Accepted (team, 2026-10-04; designed by the DevOps lead, adapted by Bernard). Amends [0004](0004-branching-and-cicd.md), [0009](0009-hosting-and-latency.md) and [0015](0015-security-and-privacy.md).
- **Date:** 2026-10-04

## Context
The DevOps lead built the pipeline (`.github/`, `deploy/`, `CONTRIBUTING.md`, `.pre-commit-config.yaml`) while the frontend scaffold was being written. The first version assumed a Python backend; the team has since confirmed **C# / ASP.NET Core 10** (0013) and the folder names `frontend/` and `backend/`. Several of its choices differ from what 0004, 0009 and 0015 said, so this record is the single place that says what we actually do.

## Decision
- **Branches:** `feature/*` (named `<type>/<short-name>`, enforced by CI) → `development` → `staging` → `main`. CI rejects any other source for `staging` and `main` (except `hotfix/*` → `main`). `staging` replaces the `uat` of 0004.
- **CI (`.github/workflows/ci.yml`):** one required check, "CI passed". It runs the branch-flow check, pre-commit hooks, gitleaks over the PR's commits, and path-filtered jobs: frontend (lint, format check, `npm audit --omit=dev`, unit tests with a **70% line-coverage gate**, build), backend (`dotnet format`, build, tests with a 70% coverlet gate) and Docker builds. Runtimes: Node 24, .NET 10.
- **Registry:** GitHub Container Registry (GHCR), images tagged `sha-<commit>`. This replaces **ECR + OIDC** from 0004: no AWS credentials are needed in GitHub at all.
- **Deploy (`deploy.yml`):** push to `staging` deploys automatically; push to `main` deploys to production after manual approval. Deploys are SSH + `docker compose` on EC2 with a health check (`GET /health`) and automatic rollback; the SSH key lives in GitHub Environment secrets. Manual re-run with an older tag is the rollback path.
- **Two EC2 instances**, one per environment, so staging can never take production down.
- **Serving:** each EC2 runs a `frontend` container (nginx, port 8080, serves the PWA and proxies `/api` to the `backend` container) and a `backend` container. This replaces the S3 + CloudFront hosting of 0009 for now; the single origin keeps "no CORS, no mixed content".
- **Hooks:** one system, `pre-commit` (0018).

## Alternatives considered
- **ECR + OIDC (0004):** better practice (no long-lived deploy key) but more AWS setup; GHCR needs none. Revisit when production hardening starts.
- **AWS SSM Run Command instead of SSH:** removes the open port 22, needs an OIDC role. Candidate for hardening.
- **S3 + CloudFront for the PWA (0009):** gives HTTPS, a Lagos edge and cheap static hosting. Still the better end state; deferred, not rejected.

## Consequences
- **Open issue: HTTPS.** The instances serve plain HTTP on port 80. Service workers (the PWA), the camera and geolocation require a secure context, so **the deployed app cannot work as a PWA until TLS is added** (a domain plus Caddy/Let's Encrypt on the instance, or CloudFront in front). This blocks the Week 1 "installable, offline-capable" requirement on the deployed environments and needs an owner.
- **Open issue: SSH.** Port 22 is open to the internet (GitHub-hosted runners have no fixed IPs), protected by key-only login. This relaxes the "SSH limited to team IPs" line in 0015.
- **Cost:** two instances will exceed the $5/month alert (0001); the free tier covers about one instance all month. Staging can be stopped outside testing.
- PRs touching `.github/`, `deploy/`, Dockerfiles, compose files or `frontend/.nginx/` need the DevOps lead's approval (CODEOWNERS).
- The backend repo folder must provide `backend/Dockerfile`, a `/health` endpoint, and a Debian-based ASP.NET runtime image (the compose health check uses bash).
