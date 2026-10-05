# ADR 0005: Offline-first data with a local outbox

- **Status:** Accepted
- **Date:** 2026-10-04

## Context
Extension agents register farmers in fields with no signal. The brief requires offline operation and synchronisation when connectivity returns.

## Decision
- The phone keeps a local database (**IndexedDB via Dexie**). **Postgres** on the server remains the source of truth for everyone.
- **Save writes locally first** and adds an entry to an **outbox**; it never waits for the network.
- Record IDs are generated **on the phone** (`crypto.randomUUID()`), so retried syncs are idempotent and never create duplicates.
- A sync engine sends the outbox in batches with retry and back-off, then pulls changes since the last sync (`updatedSince`).
- It runs on the `online` event, on app open, and via Background Sync where supported (Chrome only), so it works on every browser.
- Conflict rule for Week 1: **newest `updatedAt` wins**, applied on the server.

## Alternatives considered
- **Online-only app:** fails the brief and loses data in the field.
- **localStorage:** 5 MB, text only, blocks the UI thread.
- **Full sync engines (RxDB, PowerSync, ElectricSQL):** powerful but heavier and add a vendor/server component; revisit if conflicts get complex.

## Consequences
- Users see a "N waiting to sync" badge, so they always know what has reached the server.
- The phone stores only what that user needs (e.g. the farmers an agent registered), not the national database.
