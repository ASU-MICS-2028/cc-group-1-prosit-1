# ADR 0031: The farmer's app and farm services, built now with sample providers

- **Status:** Accepted
- **Date:** 2026-10-07

## Context
The farmer's home in Figma (23) promises a full app:
- the farmer's own details;
- a way to change them and to call their officer;
- six farm services: prices, weather, check my crop, harvest forecast, my cooperative and lessons.

The first version showed only a banner, the name and two links. The server could send a signed-in farmer nothing but their name and an ID.

Some of the data is ours today: the farmer's record, the officer who registered them, and their visits. The rest needs outside sources we don't have yet:
- market prices (MoFA SRID or Esoko);
- weather (Ghana Meteorological Agency or Open-Meteo);
- agronomy advice;
- yield models;
- the cooperatives register;
- recorded lessons.

We want to build and demonstrate the whole product now, then plug in each real source without rewriting screens or endpoints.

## Decision
A new backend service, **FarmerService**, with one endpoint per feature. All are under `/api/farmer/...`, for signed-in farmers only, and always about the caller's own farm:

| Endpoint | Data | Today |
|---|---|---|
| `GET /api/farmer/me` | The farmer's record, their officer (name and phone), their last 20 visits | **Live** from the database |
| `GET /api/farmer/prices` | Price per kg in 4 markets, the week's change, 30 days for a chart; the farmer's crops first | Sample provider |
| `GET /api/farmer/weather` | Today, the next 7 days, and farm advice (don't spray before rain, dry spell, storm) | Sample provider |
| `POST /api/farmer/crop-check` | From the crop and what the farmer sees: a likely problem, how urgent, numbered advice | Sample rules (never a diagnosis; "show your officer" when unsure) |
| `GET /api/farmer/harvest-forecast` | Bags of 100 kg expected per crop and the usual harvest month | Sample yields per acre |
| `GET /api/farmer/cooperative` | The cooperative's name, members, chair and next meeting | Sample provider |
| `GET /api/farmer/lessons` | Short lessons (title and summary in the app's language, audio per language) | Sample catalogue |
| `POST /api/farmer/change-requests` | "Change my details": the request goes to the officer who registered the farmer | Logged with a reference |

- **Providers behind interfaces.** Each outside source is an interface, such as `IMarketPriceProvider`, with a `Sample…` class today. A live class replaces it with one line in `FarmerServiceExtension`; the endpoints, the contract and the app stay the same (the same pattern as the SMS sender, ADR 0022).
- **Honest labels.** Every answer says `source: "sample"` or `"live"`, and the app shows "Sample data" while it is sample. Sample data is repeatable (the same all day, different each day), so demos and tests are stable.
- **Farmers cannot edit their own record.** The officer registered it and answers for it. "Change my details" sends a request to that officer instead.
- **Offline.** The app keeps the last answer of each call on the device (a `cache` table, version 3 of the phone database). The farmer's screens open with no network and show "No network · saved today 09:02". The data is stored per person, so a shared phone never mixes two farmers' data.
- **The farmer's menu:** Home, Market (prices), Help and Profile. On computers the top bar shows Home, Market and Help, with Profile in the account menu (ADR 0030). The other services open from Home.

## Alternatives considered
- **Wait for each real source before building its screen:** the app would stay half-empty for weeks, and the team could not test the farmer's journey end to end.
- **Fake the data in the app only (no endpoints):** quick, but the contract, authorisation and offline behaviour would be untested, and every screen would change when the real API arrived.
- **Let farmers edit their own record:** simpler for them, but the officer is accountable for registered data, and a phone shared in a family could change someone else's record.
- **Show sample data without saying so:** misleading for farmers and for anyone judging the demo.

## Consequences
- The farmer app is complete and testable today. Each live source is a separate, small task: write the provider and change one registration line.
- Change requests are only logged for now. Storing them and showing them to the officer (a task list, an SMS) needs a table, so a database migration for the DevOps lead to note.
- The crop check is rules of thumb, worded as a first guide. A photo model or agronomy service can replace it later behind the same interface.
- Lesson audio uses the recorded prompt when one exists for the language, otherwise the device's voice reads the summary (ADR 0014).
