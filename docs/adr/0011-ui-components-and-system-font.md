# ADR 0011: UI: shadcn/ui on Base UI, Tailwind v4, system font

- **Status:** Accepted (2026-10-04)
- **Date:** 2026-10-04

## Context
We need accessible, easily customised components that add little weight.

## Decision
- **shadcn/ui** with the **Base UI** primitives and the **Nova** preset (Lucide icons). Components are copied into `src/components/ui`, so we ship only what we use.
- **Tailwind CSS v4**, configured in `src/index.css` (no `tailwind.config.js`).
- **System font stack** (`system-ui`, which is Roboto on Android) instead of the preset's Geist web font: zero font download.

## Alternatives considered
- **Radix UI primitives:** more years in production and familiar to the team, but development has slowed; Base UI is maintained by the creators of Radix, MUI and Floating UI and is shadcn's recommended default.
- **MUI / Ant Design:** large bundles, harder to simplify for low-literacy users.
- **Geist web font:** extra download on every first visit for no usability gain.

## Consequences
- Theme colours are CSS variables; `--primary` will become a high-contrast AgroConnect green for outdoor readability.
- Large touch targets and icons with audio prompts are part of the design system.
