# ADR 0015: Security and privacy of farmer data

- **Status:** Proposed
- **Date:** 2026-10-04

## Context
Farmer records include phone numbers, locations and financial details. Ghana's Data Protection Act, 2012 (Act 843) applies.

## Decision
- **In transit:** HTTPS everywhere (CloudFront).
- **At rest:** RDS/EBS encryption and S3 server-side encryption; the photo bucket is private and accessed only via short-lived presigned URLs.
- **Access:** IAM least privilege; deploys use a per-environment SSH key in GitHub Environment secrets, key-only login, password login disabled (0019). Port 22 is currently open because GitHub runners have no fixed IPs; hardening options are SSM Run Command or an allow-list.
- **Secrets:** never committed (`.env` git-ignored, `.env.example` holds names only); stored in GitHub environment secrets / AWS.
- **Consent and minimisation:** an explicit consent step in registration; collect only fields with a stated purpose (`data-dictionary.md`).
- **Dependencies:** `npm audit --omit=dev` must report 0 vulnerabilities (a CI gate in the frontend job of `ci.yml`). Build tools (`shadcn` CLI, Vite, ESLint) live in `devDependencies` and never ship to a phone. On 2026-10-04 `npm audit` showed 7 high findings, all one chain (`shadcn` CLI → `fast-glob` → `micromatch` → `braces`, a DoS on deeply nested glob patterns); no patched `braces` exists and the only "fix" was downgrading shadcn to 1.0.0, so we moved `shadcn` to `devDependencies` (it is only imported for `shadcn/tailwind.css` at build time) instead of forcing it. Re-check when `braces` releases a fix.
- The server validates every request again; client-side validation is for user experience only.

## Alternatives considered
- (none recorded yet)

## Consequences
- Encrypted local data on the phone is limited in browsers; we keep only the user's own records locally and clear them on logout.
