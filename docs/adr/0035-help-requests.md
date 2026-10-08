# ADR 0035: Help requests from farmers to their officer

- **Status:** Accepted
- **Date:** 2026-10-08

## Context
Farmers needed one way to ask for help. The places it could happen were three separate frontend-only screens on sample data:
- *Get help* (Figma P4 · 03);
- *Ask my officer to confirm* after Check my crop;
- the status page that asks *Tell us if it helped* (P4 · 04).

The same question has to reach the officer's *Requests* (P3 · 10, 11) and, when it waits too long, the admin's *Help desk* (P4 · D4).

## Decision
**A HelpService and two tables:**
- `help_requests`: the question, its status and the answer;
- `help_voice_notes`: the recording, kept apart so lists never load audio.

**Who answers:**
- A question goes to the officer who registered the farmer (`farmers.registered_by_id`).
- An admin can give it to another officer in their area.
- Advice always comes from an officer, never from the help desk.

**How the farmer asks:**
- They choose a topic (my details, money or loan, my crops, something else).
- Then they record a voice note (up to 2 minutes, any language), type the question, or both.
- From Check my crop, the crop, the likely problem and the signs are sent as the question.

**Status:**
- *waiting*, then *answered*.
- After an answer, the farmer says *Yes, this helped* (*solved*) or *I still need help* (*still_needs_help*, back with the officer).
- A question waiting more than 24 hours is *overdue*. The help desk lists overdue questions first.

**Endpoints:**

| Who | Endpoint |
|---|---|
| Farmer | `POST /api/help/requests`, `GET /api/help/requests`, `POST /api/help/requests/{id}/feedback` |
| Officer | `GET /api/officer/requests`, `POST /api/officer/requests/{id}/answer` |
| Admin | `GET /api/admin/help-desk`, `POST /api/admin/help-desk/{id}/reassign`, `POST /api/admin/help-desk/{id}/remind` |
| Any of them, about their own question | `GET /api/help/requests/{id}/voice` |

**The voice note** is sent as base64 in the JSON body (webm, ogg, mp4, mpeg, wav or aac, up to 1.5 MB). It is fetched back with the sign-in token, because an `<audio>` tag cannot send one, and played in the Playing overlay.

**SMS:** the officer's answer and the admin's reminder go by SMS once the SMS provider is connected. Until then they are written to the log.

## Alternatives considered
- **Voice notes in S3 with presigned uploads:** better for big files. But photo upload is not built yet either, and a 2-minute note is about 100 KB. The database keeps it simple; it can move with the photos.
- **Questions go straight to the help desk:** farmers trust their own officer, and the officer knows the farm. The help desk only steps in.

## Consequences
- Migration `AddHelpAlertsSpeech`. On the servers it is applied automatically at start-up.
- The officer's Home card shows the real number of open questions.
