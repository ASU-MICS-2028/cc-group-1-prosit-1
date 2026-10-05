# ADR 0021: Building the UI from the Figma design

- **Status:** Accepted
- **Date:** 2026-10-04

## Context
The UI/UX is designed in Figma as a mobile design: an AgroConnect component sheet (buttons, language rows, sync chips, bottom bar, farmer rows, icons), the first-run language picker, and three frames (Home, Explore, Checkout) copied from a community marketplace template (rupee prices, cart, a New York address). The app must also work well on a computer, and users are on cheap phones and paid 2G data (ADR 0011, the 200 KB budget).

## Decision
- **Build the AgroConnect frames, not the template ones.** The component sheet and the language picker are ours. Home, Explore and Checkout are a shopping app and do not match farmer registration, so no cart, products or checkout. We reuse their visual language (soft green pills, big rounded cards, floating bottom bar) for our own Home, Farmers, Sync and Profile screens.
- **Mobile first, then wider.** Below 768 px: the floating bottom bar with Home, Farmers, Sync, Profile. From 768 px: the same four places as a sidebar, content in a column no wider than 64 rem, two-column grids for lists and the home screen. The language screen is a centred card on a computer. There is no desktop design in Figma, so this layout is ours; show it to the designer for review.
- **Keep the system font** (ADR 0011). The design uses Poppins, a web font that costs a download on 2G for no gain in function.
- **Colour tokens** in `index.css`: primary green `oklch(0.5 0.15 150)` (about 6:1 on white), soft green for secondary buttons and rows, amber, green and red for sync states. Dark mode tokens are defined too. Status is never colour alone: each state also has an icon and words ("3 waiting").
- **First-run language gate.** Until a language is chosen, `/` redirects to `/welcome`. Tapping a language previews it (the page switches at once) but only Continue remembers it, so a person can listen and compare. Switching later is on Profile.
- **Audio buttons exist now, recordings come later.** Speaker buttons play `/audio/<code>/language.mp3`; until those files are recorded (ADR 0014) pressing one stays silent. Nothing breaks without them.
- **Illustrations are inline SVG** (about 1 KB gzipped) instead of image files, so there is nothing to download.
- **Component sheet at `/design`** in development only (left out of the production build) to check the components on a phone and a computer.
- The design's nav shows Sync as a place, so sync status has its own page. "Register a farmer" is a button (home, farmers list), not a tab.

## Alternatives considered
- **Build every Figma frame:** wastes days on a shopping flow we do not need.
- **Poppins:** closer to the picture, but extra bytes on the slowest network we serve.
- **Separate mobile and desktop apps:** double the work; one responsive layout does both.

## Consequences
- Farmer rows, the home status chips and the sync page read from `useFarmers()`, which returns an empty list until the offline store (Dexie) is built next. The empty states are what shows now.
- Twi, Ewe and Dagbanli text for the new screens must come from native speakers (ADR 0014); until then those languages fall back to English.
- Initial JavaScript is about 125 KB gzipped (budget 200 KB); each page is its own lazy chunk.
