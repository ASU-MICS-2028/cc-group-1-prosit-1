# ADR 0039: Real sign-in codes, with a backup code for when SMS fails

- **Status:** Accepted
- **Date:** 2026-10-08
- **Changes:** ADR 0022 (the fixed laptop code)

## Context
Until now laptops and the staging demo used a fixed code (`Auth:FixedCode`, `123456`): every code was 123456, even for real numbers that also got an SMS. With Arkesel connected (ADR 0037), the team signs in with real phones: an officer, a MoFA admin and a farmer. A fixed code means the SMS proves nothing, and the demo does not show what farmers will really see.

We still need a way in when SMS is down (no Arkesel credit, a network outage at the venue), and for the demo accounts with made-up numbers that can never receive an SMS.

## Decision
- **Codes are always random** (6 digits from a cryptographic random generator) and texted, everywhere.
- **A backup code** (`Auth:BackupCode`) is accepted **as well as** the texted code, only where it is set:
  - laptops (`123456` in `appsettings.Development.json`) and the staging demo;
  - still only after "Send code", only within the code's 10 minutes and 5 tries, and only for a number that has an account. An unregistered number is refused, as before;
  - every sign-in with it is written to the log as a warning (`Signed in with the backup code`).
- **Production refuses to start** if a backup code is set. Anyone who knows a registered number could sign in with it.
- **The old name `Auth:FixedCode` is still read** as the backup code, so the staging server keeps working until its setting is renamed to `Auth__BackupCode`.
- **Real team accounts are seeded from secrets, never from committed files:**
  - `Seed:Officers`, `Seed:Admins` and the new `Seed:Farmers` (name, phone, the registering officer's phone, community and crops) are set in user-secrets on a laptop or as server secrets;
  - the made-up demo accounts (024 000 0001, 024 000 1234, 024 000 0009) stay as the backup;
  - on a laptop, SMS only goes to the numbers in `Sms:OnlyTo`.
- **An unregistered person** asks for a code, gets the same "code sent" answer (so the screen does not reveal who is registered), and no SMS arrives. Once the resend wait is over, the code screen says: "Still no SMS? Codes only go to numbers registered with AgroConnect. Ask your extension officer or MoFA admin." Any code they type is refused.

## Alternatives considered
- **Keep the fixed code:** simplest, but the SMS is meaningless and the demo is not the real product.
- **No backup at all:** the most secure, but a failed SMS (no credit, no network) would stop a demo or a field day completely.
- **A backup code for the demo accounts only:** it would not help the real team phones when SMS fails, which is the case it exists for.
- **Telling an unregistered number "not registered" straight away:** clearer, but it lets anyone check whether a phone number belongs to a farmer, an officer or an admin. The hint on the code screen gives the same help without that leak.

## Consequences
- Every sign-in now shows a real SMS code; the backup code is a documented fallback, not the normal way in.
- Codes for numbers not on `Sms:OnlyTo` (the demo accounts) appear in the API log on a laptop, as before.
- **The DevOps lead needs to know:**
  - **Renamed setting:** on staging, rename `Auth__FixedCode` to `Auth__BackupCode` in `deploy/terraform/app-config.tf`. The old name keeps working until then.
  - **Production:** must never set either name; the API refuses to start if it does.
  - **New optional settings:** `Seed__Farmers__N__*`.
- **Next:**
  - turn off the backup code on staging once SMS on the servers is proven (DevOps lead);
  - an admin screen to add officers and admins, replacing the seed for real accounts (Bernard).
