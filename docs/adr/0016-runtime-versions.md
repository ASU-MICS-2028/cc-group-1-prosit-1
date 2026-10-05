# ADR 0016: Runtime versions

- **Status:** Accepted (2026-10-04)
- **Date:** 2026-10-04

## Context
Choosing versions that stay supported through the project.

## Decision
**Node.js 24 LTS**, **.NET 10 SDK (LTS)**, React 19, Vite 8, TypeScript 6, Tailwind CSS 4, zod 4.

## Alternatives considered
- **Node 20:** end of life April 2026. **.NET 8:** support ends November 2026.

## Consequences
- Everyone on the team installs the same major versions; CI uses the same.
- Some tools haven't declared TypeScript 6 support yet. `openapi-typescript` 7.13 asks for `typescript ^5`; we tell npm to use our TypeScript 6 for it with an `overrides` entry in `package.json` (`"openapi-typescript": { "typescript": "$typescript" }`), scoped to that one package. Tested 2026-10-04: generation works on 6.0.3. We avoid `--legacy-peer-deps`/`--force`, which would silence peer checks for every package. Remove the override once openapi-typescript supports TypeScript 6.
