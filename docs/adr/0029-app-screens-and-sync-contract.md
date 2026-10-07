# ADR 0029: The Phase 1 app screens, their navigation, and the sync contract the app expects

- **Status:** Accepted
- **Date:** 2026-10-07

## Context
The Figma file has every Phase 1 screen for phones (03 to 28, the farmer's screens, Change Language) and computers (D04 to D20). Until now only sign-in and registration were built. Home, Farmers, Sync and Profile were early placeholders, with titles, sizes and menus that did not match the design. The designs also show places that belong to later phases (Market, Money, notifications, prices, weather). The sync screens need the server's farmer service, which is not built yet.

We had to decide which screens to build now, what the menus contain, how screens behave without a server, and what the app will send to the server so the farmer service can be built against it.

## Decision

**Screens built from Figma, for phones and computers (team rule "Phone vs Desktop"):**

| Who | Screens |
|---|---|
| Officer | Home (03, D04) with "No farmers yet" (17, D05) and "No network" (18, D06); My farmers (13, D16: a table with a preview panel on computers); Farmer (14, D17); Edit farmer (20); Sync (15, D18); Profile (16, D19); Log out? (25); Visits (26); Log a visit (27); Help (24); Install the app (22); Change language |
| Farmer | Home (23), Help, My Profile, Change language, Install |
| Everyone | "A new version is ready" sheet (21) |

**Menus.** Officers: Home, Farmers, Visits, Profile (bottom bar on phones; sidebar from 768 px with "N not sent yet / Open Sync" and "Register a farmer"). Farmers: Home, Help, Profile. Market and Money join with their Phase 2 screens; a menu item never leads to an empty page. Sync opens from the waiting badge, the sidebar card and Profile.

**One look everywhere.** Page titles 24 px green, section titles 16 px, rows of 16 + 14 px, cards with 12 to 30 px corners, and the system font at Figma's sizes (no web fonts, ADR 0011). The shared pieces live in `src/components/` (`Blocks.tsx`, `Sheet.tsx`, `SyncBadge.tsx`) and are reused by every screen.

**Pictures with words.** The banners' words ("Ready to register a new farmer", "You are registered with MoFA") are real text over the picture, so every language can say them. Only the drawing is an image, loaded when shown (ADR 0025).

**Listen.** "Listen to this profile" reads the farmer's details with the device's own voice until recorded prompts exist (ADR 0014). It needs no download and works offline.

**Visits.** An officer logs a visit from the farmer's page: topics, what was seen, photos, notes, next visit. It is saved on the device (table `visits`) and queued for sync like a farmer. Planned visits ("Tomorrow", the route, "Start visit") come later from the server's visit planning.

**Help line.** The Call and SMS rows on Help appear only when `VITE_HELP_LINE` is set at build time, so the app never shows a made-up number.

**The sync contract the app already uses.** The app sends its outbox in one batch and handles each answer:

```
POST /api/sync            (signed in as an officer)
{ "farmers": [ { "id": "...", "fullName": "...", "phoneE164": "+233...", ... } ],
  "visits":  [ { "id": "...", "farmerId": "...", "topics": ["pests"], ... } ] }

200 { "results": [ { "id": "...", "outcome": "created" | "updated" | "unchanged" | "invalid" | "forbidden",
                     "problem": "Phone number is too short" } ] }
```

- Records answered `created`, `updated` or `unchanged` become **Synced** and leave the queue.
- Records answered `invalid` or `forbidden` become **To fix** and show `problem` (in the officer's language) until edited.
- Records not answered stay queued.
- A failed call (no network, server error) keeps everything queued and counts the attempt.
- The app sends automatically when it opens and when the network comes back, and when the officer taps Sync now.

## Alternatives considered
- **Build Market, Money, notifications and the MoFA reports page (D20) now:** each needs a backend that does not exist yet (prices, payments, an admin role). Empty or fake screens would mislead in the demo. They stay in Figma for their phases.
- **Keep the menus from Figma exactly (Market, Money):** taps leading to "coming soon" pages are worse than a shorter menu.
- **Words inside the banner pictures:** simpler to export, but English only.
- **Wait for the server before building Sync:** the screens, the queue and the contract can be built and tested now with a fake server. The farmer service then only has to answer the contract.

## Consequences
- Sync now reports "Could not send right now" against today's servers, because the farmer service is not built yet. Everything stays safely queued. Building `POST /api/sync` to this contract (Bernard and Liza) makes it work without app changes.
- Update (7 Oct): `POST /api/sync` is built to this contract (ADR 0032).
- The farm card on the farmer page is drawn twice (second on phones, on the right on computers), so the order matches Figma at both sizes.
- Each new screen has tests against the real on-device database and a fake server (`src/test/fakes.ts`).
