# ADR 0038: USSD for simple phones, through Arkesel

- **Status:** Accepted
- **Date:** 2026-10-08

## Context
About one in four farmers has a simple phone, with no apps and no data (ADR 0002). USSD reaches every phone: the farmer dials a code such as `*928*1#` and a menu appears, free and offline. The plan named Africa's Talking.

The team already uses **Arkesel** for SMS (ADR 0037). Arkesel also runs USSD, with a sandbox and an emulator for testing at no cost.

How Arkesel USSD works:
- Arkesel calls our **callback URL** (a POST with JSON) for every key the person presses:

  ```
  { "sessionID": "...", "userID": "<our USSD app id>", "newSession": true,
    "msisdn": "233271231234", "userData": "1", "network": "MTN" }
  ```

- We answer with the next screen:

  ```
  { "sessionID": "...", "userID": "...", "msisdn": "...",
    "message": "...", "continueSession": true }
  ```

- `continueSession: false` closes the menu. A session times out after about 2.5 minutes.
- **Only the latest key is sent,** never the whole path, so the server must remember where each session is.

## Decision
- **A new backend service, UssdService,** with `POST /api/ussd/arkesel`. It needs no sign-in: the farmer is recognised by the number they dial from, using the first farmer registered on that phone, as for sign-in.
- **The menu,** kept within one USSD screen (182 characters) and written for any phone:

| Key | What the farmer gets |
|---|---|
| (dial) | "Akwaaba Ama!" and 1 Market prices, 2 Weather, 3 Ask my officer, 4 My officer's number, 0 Exit |
| 1 | Their own crops first; choosing one shows the price per kg in each market and the change this week |
| 2 | Today's weather where they farm, and the farm advice (don't spray before rain, dry spell, storm) |
| 3 | Crops or pests, Money, My details, Something else: creates a **help request** for their officer (ADR 0035), so it appears in the officer's Requests and the admin's Help desk, and says "They will call you soon" |
| 4 | Their officer's name and number, written as people dial it (024 000 0001) |
| 0 | Back, or exit from the main menu |

- **An unregistered number** gets "this number is not registered. Ask your extension officer to register you." Nothing is stored.
- **The place in the menu is kept in the database** (table `ussd_sessions`), not in memory. Production runs 2 to 4 servers, and the next key can reach another one. Sessions older than 10 minutes are cleared when someone dials.
- **The same farm services as the app:** prices and weather come from the same providers (sample today, ADR 0031), so the app and USSD always agree.
- **Only our USSD app is answered.** When `Ussd:UserId` is set to the app id Arkesel gives us, requests with another id are refused (403). Left empty, any request is answered, which suits the sandbox emulator.
- **Menu text** is in `UssdService/Langs/en.json` and follows the farmer's language as translations are added (ADR 0014).
- **The menu logic** (`UssdMenu`) is separate from Arkesel's request format, so another gateway (for example Africa's Talking) is one more small endpoint.

## Alternatives considered
- **Africa's Talking:** a good USSD provider, but the team's account, credit and approved sender ID are with Arkesel, and one provider for SMS and USSD is simpler to run and pay.
- **Session state in memory:** fine for one server, but the next key can reach another server behind the load balancer and the farmer would be thrown back to the start.
- **Rebuilding the path from every key:** impossible with Arkesel, which only sends the latest key.
- **Registering farmers over USSD:** left out. Registration needs consent and checks by an officer (ADR 0024), and USSD sessions are too short for seven steps.

## Consequences
- Farmers with simple phones get prices, weather, their officer, and a way to ask for help.
- **The DevOps lead needs to know:**
  - **A database migration,** `AddUssdSessions` (one new table).
  - **A new setting,** `Ussd__UserId` (Arkesel's USSD app id), on each server that Arkesel calls.
  - **Arkesel must reach** `https://<server>/api/ussd/arkesel` over HTTPS (the CloudFront address works).
- **Testing:**
  - Postman, folder *USSD (as Arkesel calls it)*, on a laptop.
  - Arkesel's emulator, once the callback URL is public: a deployed server, or a temporary tunnel to a laptop (local-development 5.15).
- **Next:**
  - menu text in Twi, Ewe and Dagbani;
  - an SMS that confirms a help request;
  - checking a payment or the last visit.
