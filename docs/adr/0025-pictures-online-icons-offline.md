# ADR 0025: Pictures load online; icons are the offline placeholder

- **Status:** Accepted
- **Date:** 2026-10-05

## Context
The Figma design now uses real pictures on the choice tiles: crop photos (maize, rice, yam...) and option pictures (a goat, cedi notes, a rain puddle...). They make the app easier to use for low-literacy farmers.

They are also heavy. As exported today each picture is **45 to 350 KB**, and the registration form alone uses about 30 of them. The app has to install and work on cheap Android phones on paid 2G data, and officers work offline for days (ADR 0005, ADR 0022). The initial JavaScript budget is 200 KB (`status.md`); the pictures would be several times that.

## Decision
**Pictures are an extra, never a requirement. With no internet, a tile shows its icon instead of its picture.** The label is always shown, so every choice works without the picture.

| Rule | Detail |
|---|---|
| Not in the bundle | Pictures are not imported into the JavaScript bundle and are **not precached** by the service worker. Installing the app does not download them |
| Small files | Each picture is exported as **WebP at 2× its display size**: 160 px for a 64 to 80 px tile, about 340 px wide for a crop card. At 160 px the current pictures are **3 to 9 KB** each |
| Loaded when online | `<img loading="lazy">` with a fixed width and height, so the layout never jumps |
| Kept once seen | Workbox runtime caching, **cache-first**, about **60 entries, 30 days**, so a picture seen once still shows offline later |
| Placeholder | Offline and not cached, or the picture fails to load: the tile shows its **icon** (Figma: *Picture Tile*, variant *Media=Icon*: icon in a green circle, same size and label) |
| Never wait | The icon is shown until the picture arrives; no step waits for an image |
| Save data | If the phone asks to save data (`navigator.connection.saveData`), show icons only |

Every picture therefore needs a matching icon, which the tiles already have.

## Alternatives considered
- **Precache all pictures with the app:** works offline from the first minute, but adds roughly 1 to 3 MB to every install and update on paid data.
- **Icons only, no pictures:** lightest, but the team reviewed the icon-only design and found it dull and harder to recognise.
- **Inline pictures as data URLs in the bundle:** the same weight as precaching, and it breaks the JavaScript budget.

**Amended 2026-10-07: the team's source files, unchanged.** The drawings and crop photos come straight from the design team's source files, kept by the designers and in Figma; only their CREDITS files are in Git, under `design/assets/` (the working files are 24 MB and the app does not need them). Files exported from Figma frames are no longer used: some were distorted. Each drawing is copied byte for byte (SVG with its own `viewBox`, so it scales without stretching; the server gzips it on the way). Crop photos are the original JPGs, not re-encoded, so no detail is lost; they are larger than WebP (44 to 377 KB) but load once and are then kept on the phone. Cards fit a picture inside (`object-contain`) or crop the edges of a photo (`object-cover`); nothing is ever stretched. The "Hello, Akwaaba! Choose your language" banner is real text beside the people drawing. The source folders stay out of `frontend/public/`, so they are not shipped with the app or saved on install.

## Consequences
- The first time a farmer or officer sees a screen offline, they get icons; once they have been online, they get pictures.
- Designers keep an icon for every picture. A new picture without an icon is not allowed.
- Picture files live outside the bundle (for example `public/pictures/`, or S3 and CloudFront with the PWA, ADR 0009), with credits in the app's About page as the licences require.
- The Workbox runtime-cache rule and the icon fallback need a test: offline with an empty cache must render the icon and the label.
