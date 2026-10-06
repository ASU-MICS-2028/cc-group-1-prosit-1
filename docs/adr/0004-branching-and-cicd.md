# ADR 0004: Branching strategy and CI/CD

- **Status:** Accepted (2026-10-04); amended by [0019](0019-devops-pipeline.md)
- **Date:** 2026-10-04

## Context
We want a path to UAT and production from the start, and Week 4 of the brief requires a full CI/CD pipeline.

## Decision
- Branches: `feature/*` → PR into **`development`** (default branch, integration only, never deployed) → **`staging`** (QA, deployed automatically) → **`main`** (production, deployed after approval). One repo (0017), so a cross-cutting feature is one branch and one PR. CI enforces the flow and branch names (0019).
- No direct pushes to environment branches; every change goes through a PR.
- **GitHub Actions:** on each PR run lint, tests (70% coverage gate), build and Docker builds (path-filtered). On merge to `staging` or `main`, build images, push to **GHCR**, and deploy to that environment's EC2 over SSH (details in 0019).
- No AWS credentials are stored in GitHub; the deploy uses a per-environment SSH key held in GitHub Environment secrets. (0004 originally planned ECR + OIDC; changed in 0019.)

## Alternatives considered
- **Trunk-only (`main`):** simpler, but no staging step before production.
- **SSH deploy from Actions:** originally rejected because it widens the attack surface; adopted in 0019 for simplicity, with key-only login, and listed there as a hardening item.

## Consequences
- Actions minutes are free for public repos and within the free allowance for private ones at our build size (~3-5 min per run); confirm under the org's Billing settings.
- Branch protection rules on private repos need a paid/education plan; if unavailable, the rule is enforced by team agreement.
