# ADR 0010: Frontend libraries

- **Status:** Accepted
- **Date:** 2026-10-04

## Context
Every kilobyte is paid for by the farmer on 2G. A library earns its place only if it does something hard we would otherwise get wrong.

## Decision
React 19 + TypeScript + Vite, **vite-plugin-pwa** (Workbox), **Dexie**, **i18next/react-i18next**, **react-hook-form + zod v4**, **browser-image-compression** (lazy), **react-router-dom**, **openapi-typescript** (dev only). Full reasoning per library, with rejected alternatives: [`../tech-choices.md`](../tech-choices.md).

## Alternatives considered
Left out on purpose: Redux (Dexie covers local state), TanStack Query (until online-only screens exist), moment.js (`Intl` instead), heavy chart/UI kits.

## Consequences
- Budget: initial JavaScript under ~200 KB gzipped, verified with the build output and Lighthouse on simulated slow 3G.
- Everything not needed on the first screen is lazy-loaded.
