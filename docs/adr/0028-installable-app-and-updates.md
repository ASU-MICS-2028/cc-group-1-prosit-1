# ADR 0028: Installing the app, working offline, and updates

- **Status:** Accepted
- **Date:** 2026-10-07

## Context
AgroConnect is a Progressive Web App (ADR 0002): one web address that officers and farmers can install on the home screen, with no app store. Until now it was a plain website. It needed internet to open, had no icon and no install option. Officers work for days without signal (ADR 0005), so the app itself, not only the data, must open offline. Updates must reach phones without an app store, and must never interrupt an officer in the middle of registering a farmer.

## Decision
We use `vite-plugin-pwa` (Workbox underneath), already chosen in ADR 0010, configured in `frontend/vite.config.ts`.

| Part | Choice |
|---|---|
| **Manifest** | Name "AgroConnect Ghana", short name "AgroConnect", brand green `#007e2f`, opens full screen (`standalone`) at `/`. Icons 64, 192 and 512 px plus a maskable 512 px icon (Android's round or squircle shapes) and a 180 px icon for iPhone. All are made from one source picture, `public/app-icon.svg` |
| **What is saved on the device** | On first visit the service worker saves every page's code, the styles, the small icons and the language files: about 270 KB to download, so **every screen opens offline**, not only the ones already visited |
| **Pictures** | Not saved up front (ADR 0025). Each illustration is saved the first time it is shown (cache-first, up to 60 pictures, 30 days) |
| **Never cached** | `/api`, `/swagger` and `/health`. Data always goes to the server or waits in the phone's own database (outbox, ADR 0005) |
| **Offline addresses** | Any app address opened offline (`/farmers`, `/register?step=3`) loads the saved app, which shows the right screen |
| **Updates** | **Ask, never force** (`registerType: "prompt"`). When a new version is on the server, the app shows "A new version is ready" with Reload and Later. Drafts and saved farmers are kept across the reload |
| **Install** | Our own "Install AgroConnect" card, using the browser's install event. "Not now" hides it for 14 days. iPhones have no install event: Share → Add to Home Screen |
| **When messages appear** | Never while signing in or registering a farmer, except "new version", which the person can postpone |

## Alternatives considered
- **Update automatically** (`autoUpdate`): simpler, but a reload in the middle of a registration would surprise the officer.
- **Save only the first screen and load the rest when visited:** a smaller first download. But a screen never visited online would be missing in the field.
- **Save the pictures up front:** 1.3 MB more on every install and update (ADR 0025).
- **A native Android app:** app store, a bigger download, a second codebase (ADR 0002).

## Consequences
- The service worker runs only in the built app. Use `npm run build` then `npm run preview` to test it; `npm run dev` stays a quick development server without it (`local-development.md` 5.10).
- Installing needs HTTPS. On a laptop `localhost` counts as secure; on a real phone over USB, Chrome's port forwarding makes the phone's `localhost` reach the laptop. The servers need HTTPS before phones can install from them (open issue, ADR 0019).
- nginx already serves `sw.js` and `index.html` with `no-cache`, so new versions are found at once. No change to the server or Docker files was needed.
- Each new deploy shows the update prompt on devices that are already open.
