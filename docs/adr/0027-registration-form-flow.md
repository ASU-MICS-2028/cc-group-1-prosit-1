# ADR 0027: How the registration form works on the phone

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

Registering a farmer is the main job of the app. It happens on a farm, often with no network, on a cheap phone whose battery may die, with a farmer who may not read. The Figma design splits it into 7 short steps (consent, about the farmer, the farm, location and photo, contact, money, help needed), then "Check and save", "Saved", a form error state and a "possible duplicate" screen, for phones (04 to 12, 19, 28) and computers (D07 to D15).

We had to decide how the steps are held together, when answers are kept, what happens before consent, how a shared family phone number is handled, and where the form sits in the app.

## Decision

1. **One form, seven steps.** One react-hook-form form with one zod rule set holds all 7 steps. "Next" checks only the current step's questions. "Check and save" checks everything again and opens the first step with a problem.
2. **The step is in the address** (`/register?step=3`, `?step=review`). The phone's back button goes back one step, and a reload opens the same step. "Edit" on Check and save adds `from=review`, so "Done" returns there.
3. **Nothing is kept before consent.** Before "Yes, I agree" the form keeps nothing. After it, every answer goes into a draft on the phone half a second after the last change ("Draft saved"). Leaving and coming back opens the same step with the same answers. "No" deletes any draft. "Save and exit" keeps it.
4. **Saving is one step.** The farmer, its "to send" note (outbox) and the link to its photo are written in one IndexedDB transaction, and the draft is removed in the same transaction. A farmer is never saved without being queued for sync.
5. **Shared phones are warned, not blocked.** Families share phones, so the number is not unique (data dictionary 6). If a farmer on this phone already has the number, "Check before saving" shows both people. The officer chooses "Different person, shares the phone" (save) or "Same person" (open the existing profile and drop the draft). The server will run the same check across all phones when sync is built.
6. **Location and photo never block.** GPS and the camera are optional. GPS works without network and shows its accuracy. Without a fix or a camera the officer just goes on. The photo is shrunk to about 150 KB on the phone. The shrinking library loads only when someone takes a photo.
7. **Full screen while registering.** The form has its own header and Back/Next, without the bottom bar or sidebar, so a stray tap on a menu cannot lose a half-done form. After saving, the "Saved" page is inside the app again: the sidebar on computers, no bottom bar on phones.
8. **Same rules on every size.** Under 768 px the phone design applies. From 768 px the computer design: a top bar with "Save and exit", questions side by side, Back and Next at the bottom right. From 1024 px a guide panel with the picture and the list of steps is added. The questions and rules are the same; only the layout changes (team rule "Phone vs Desktop").

## Alternatives considered

- **One form per step, each saved separately:** simpler at first. But the checks would be spread out, and a farmer could be half saved and half synced.
- **Step kept only in memory:** the phone's back button would leave the form, and a reload would lose the place.
- **Keep a draft from the first screen:** would store a person's details before they agreed (Data Protection Act; ADR 0015).
- **Refuse a phone number that is already used:** wrong for families who share one phone, and it cannot work offline across phones anyway.
- **Require GPS and a photo:** many phones have no fix under trees or no working camera. Blocking registration loses farmers.
- **The form inside the normal app layout:** a menu tap in the middle of a registration would throw the officer out of it.

## Consequences

- The form page is the biggest download in the app (about 55 KB gzipped, mostly the form and rule libraries). It loads only when "Register a farmer" is opened, so the first screen stays at about 130 KB.
- Drafts and saved farmers live in the browser's IndexedDB. Clearing site data before sync loses them. The planned sync screen and "N waiting" badge make waiting records visible.
- The duplicate check sees only farmers on this phone until the server check exists.
- Tests run on an in-memory IndexedDB (`fake-indexeddb`), so the save path is tested end to end on a laptop. GPS and the camera still need a check on a real phone.
