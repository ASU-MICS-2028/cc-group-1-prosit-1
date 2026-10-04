# ADR 0004: Branching strategy and CI/CD

- **Status:** Accepted (2026-10-04); deploy pipeline planned
- **Date:** 2026-10-04

## Context
We want a path to UAT and production from the start, and Week 4 of the brief requires a full CI/CD pipeline.

## Decision
- Branches: `feature/*` → PR into **`development`** (default branch, deploys to the dev EC2) → **`uat`** (later) → **`main`** (production, later). One repo (0017), so a cross-cutting feature is one branch and one PR.
- No direct pushes to environment branches; every change goes through a PR.
- **GitHub Actions:** on each PR run lint, type-check, tests and build (path-filtered). On merge to `development`, build a Docker image, push to **Amazon ECR**, and the EC2 host pulls it.
- Actions authenticates to AWS with **OIDC** (short-lived credentials), never stored access keys.

## Alternatives considered
- **Trunk-only (`main`):** simpler, but no staging step before production.
- **SSH deploy from Actions:** our security group allows SSH only from team laptops; opening it to GitHub's IP ranges would widen the attack surface.

## Consequences
- Actions minutes are free for public repos and within the free allowance for private ones at our build size (~3-5 min per run); confirm under the org's Billing settings.
- Branch protection rules on private repos need a paid/education plan; if unavailable, the rule is enforced by team agreement.
