# ADR 0032: The sync service: how the server stores what officers saved offline

- **Status:** Accepted
- **Date:** 2026-10-07

## Context
Officers register farmers and log visits on their phones with no network (ADR 0005). Each record is saved on the phone first, with an id made on the phone, and is queued in the outbox. ADR 0029 fixed the contract the app sends: `POST /api/sync` with `{ farmers, visits }`, and one answer per record: `created`, `updated`, `unchanged`, `invalid` or `forbidden`.

Until now the server had no such endpoint. Farmers registered in the field never reached the server, so they could not sign in. Sync now said "Could not send right now".

The server has to stay correct with real phones in the field:
- signals drop mid-send, so batches are retried;
- one officer can use a phone and a laptop;
- cheap phones often have the wrong date;
- an officer can run an older app version than the server;
- a record must never be changed by an officer who does not own it.

## Decision
A new backend service, **SyncService** (`backend/Services/SyncService`), with one endpoint, `POST /api/sync`, for signed-in officers only.

| Rule | What the server does |
|---|---|
| Who owns a record | The signed-in officer. The `registeredById` and `officerId` the phone sends are ignored. |
| Another officer's record | Answered `forbidden` ("Another officer registered this farmer"), and nothing changes. |
| The same batch sent twice | The ids were made on the phone, so the second send finds the records and answers `unchanged`. Nothing is copied. |
| Two copies of one record | The newest change wins, by `clientUpdatedAt` (when it changed on the phone). An older copy is answered `unchanged`. |
| A phone clock in the future | Times are stored as "now" at most, so the next real edit is never treated as older. |
| Breaks a rule | Answered `invalid` with the reason in the officer's language (for example "The phone number is not a Ghana number"). The same rules as the registration form: consent, name 2 to 100 letters, a Ghana number unless "No phone", at least one crop, a farm size above 0, a whole location or none. A finished visit needs its end time; notes are 2000 letters at most. |
| A record the server cannot read | An unknown option (an older or newer app), or a wrong type: only that record is answered `invalid`. The rest of the batch is still stored. |
| A visit whose farmer is not on the server yet | No answer, so it stays queued on the phone and goes with the next sync, after its farmer. |
| A batch too large | Up to 500 farmers and 500 visits per call are answered. The rest stay queued. The app sends 100 records per call anyway, so a weak signal only has to carry a small request. |
| All or nothing | The batch is saved in one transaction. A failure stores nothing, and the phone keeps the whole batch and retries. |

- Phone numbers are stored in one form (`+233...`). A farmer who has a phone can then sign in at once, with the number the officer typed (ADR 0022).
- The contract is in `backend/openapi/agroconnect.json` (`SyncRequest`, `SyncFarmer`, `SyncVisit`, `SyncResponse`). The app uses the generated types (`frontend/src/api/sync.ts`).
- `created_at` is when the server first received the record. The time of registration on the phone is kept as `consent_at`.
- No database change: the farmers and visits tables already have the sync columns (`client_updated_at`, `server_updated_at`; data dictionary 4.3 and 4.4).

## Alternatives considered
- **Refuse the whole batch when one record is wrong:** simpler, but one old or broken record would block an officer's whole queue for good.
- **Trust the officer id the phone sends:** a changed app could then write records as someone else.
- **The last record to arrive wins:** a phone that was offline for a week would overwrite newer edits made on the officer's laptop.
- **Answer a visit whose farmer is missing with `invalid`:** the officer would have to fix something that fixes itself once the farmer is sent.
- **One request per record:** many small requests cost more data and time on 2G than a few batches.

## Consequences
- Farmers registered in the field reach the server and can sign in with their own number. The whole offline journey works end to end.
- Sending is safe to repeat at any time: on opening the app, when the network returns, on Sync now, and before logging out.
- Next step (Bernard): `GET /api/sync/changes`, so a phone or laptop also receives what the officer saved on another device, for example the farmers list on a new laptop.
- Photos are not sent yet. The record keeps its `photoId`; the upload comes with the photo storage work (ADR 0008). The API check of photo links (ADR 0023) comes with it, because no photo can be on the server before then.
- Records refused as `forbidden` stay on that phone as "To fix". Moving a farmer to another officer will be a MoFA admin task (D20).
