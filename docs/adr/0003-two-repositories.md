# ADR 0003: Two repositories: frontend + DevOps, and backend

- **Status:** Superseded by [0017](0017-single-repository.md) (same day, before any code was committed)
- **Date:** 2026-10-04

## Context
We are planning for a long-lived product, not just the course. Bernard's industry experience (MTN) is separate repos per service.

## Decision
- **cc-group-1-prosit-1:** the Vite React PWA at the repo root (`public/`, `src/`), DevOps files beside it (`Dockerfile`, `.nginx/`, `scripts/`, `aws/`, compose files), and `docs/`.
- **cc-group-1-prosit-1-api:** the ASP.NET Core backend at its root.
The repos stay in step through an **OpenAPI contract** (0013): the backend publishes it, the frontend generates TypeScript types from it.

## Alternatives considered
- **One repo with `frontend/` and `backend/` folders:** simpler coordination for a small team; rejected in favour of independent ownership and deployment.
- **A long-lived `devops` branch:** rejected; infra must change together with the code it deploys, so DevOps files live in the frontend repo and use normal feature branches.

## Consequences
- Least-privilege access per repo, separate CI secrets, and one IAM role per pipeline (see 0015).
- Each service is built, deployed and rolled back independently.
- Cost: cross-repo changes need two linked PRs. Mitigated by naming the branches identically and generating types from the contract.
- Lecturer must be added to both repos; READMEs link to each other.
