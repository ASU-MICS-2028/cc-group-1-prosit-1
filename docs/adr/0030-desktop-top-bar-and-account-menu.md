# ADR 0030: A top bar and an account menu on computers

- **Status:** Accepted
- **Date:** 2026-10-07

## Context
The Figma desktop frames (D04 to D19) put every place, Profile included, in a left sidebar and have no bar across the top. Most web apps people already know (email, banking, office tools) work differently on a computer. A bar across the top carries the logo, search and the person's account. The person's own things (profile, language, sign out) sit in a menu behind their avatar at the top right. A sidebar is kept for the work sections when there are many. Without that pattern, Profile and Log out were hard to find, and every page repeated the search and the sync badge in its own header.

On phones the standard is different and already followed: a bottom bar with the main places, Profile included.

## Decision
From 768 px (the team's breakpoint, still a width check, never device detection):

| | Officer | Farmer |
|---|---|---|
| **Top bar** (every page) | AgroConnect logo, search farmers, the sync badge, the account menu | AgroConnect logo, Home and Help as links, the account menu |
| **Sidebar** | The work sections: Home, Farmers, Visits (Market and Money join in Phase 2), "N not sent yet", Register a farmer | None (too few places for one) |
| **Account menu** (initials, top right) | Name and role, Profile, Language, Help, Install the app, Log out | The same |

- Log out from the menu opens the same "Log out?" question as Profile (it offers to sync first).
- Under 768 px nothing changes: the bottom bar (officer: Home, Farmers, Visits, Profile; farmer: Home, Help, Profile).
- Pages no longer show their own search box or sync badge on computers, because the top bar has them.
- The menu uses Base UI's accessible menu: Enter or Space opens it, arrows move, Escape closes.

## Alternatives considered
- **Keep Figma's sidebar with Profile in it:** Profile and Log out are hard to find, and the officer's sidebar fills up as Phase 2 adds places.
- **A top bar only, no sidebar, for officers too:** fine for three places, but officers get Market and Money next, and MoFA admins many more.
- **Pick the layout by detecting the device:** unreliable (tablets, resized windows, browsers reporting a computer); the team rule uses width.

## Consequences
- The Figma desktop frames should be updated with the top bar and the account menu, so the design and the app agree.
- Tests check both navigations (jsdom draws the phone and computer versions together) and the account menu.
- The Figma is the main design guide, but where a frame departs from common practice we follow the standard pattern and record it here, so the team can update Figma.
