# ADR 0037: SMS through Arkesel, safe by default

- **Status:** Accepted
- **Date:** 2026-10-08

## Context
Sign-in sends a 6-digit code by SMS (ADR 0022). Until now the SMS only went to the server log, so nobody could sign in on the deployed servers. Africa's Talking was the planned provider.

The team has an **Arkesel** account (a Ghanaian SMS provider) with credit and an **approved sender ID, "AgroConnect"**.

A risk came with real SMS. The demo accounts on laptops and staging use made-up numbers (024 000 0001 and so on) that belong to real people. A laptop with a working key would text those strangers on every test sign-in, and spend credit.

## Decision
- **Arkesel replaces Africa's Talking** as the SMS provider:
  - `POST https://sms.arkesel.com/api/v2/sms/send` with the `api-key` header;
  - sender `AgroConnect`;
  - numbers written as `233XXXXXXXXX`.
- **SMS lives in the shared library** (`SharedLibrary/Sms`), so every service can send texts: sign-in codes today, the officer's advice and confirmations later.
- **Safe by default.** A real SMS goes only to the numbers in `Sms:OnlyTo`, unless `Sms:TextEveryone` is true. Every other number goes to the log. So a laptop or staging server with a key can never text a stranger, even if someone forgets a setting. Only production turns on `TextEveryone`.
- **Without a key** (tests, CI, a laptop without the secret), every SMS goes to the log, as before.
- **Every send has an outcome:**
  - `sent`: Arkesel accepted it;
  - `logged`: not texted, on purpose;
  - `failed`: with Arkesel's reason, such as "Insufficient balance" or "Invalid Sender ID".
- **If the code cannot be sent, sign-in says so:** "We could not send the code right now. Try again in a minute." (503). The person is never left waiting for a code that will not come.
- **Admins can test SMS on any server:** `POST /api/admin/sms/test` texts their own phone, or a number they give, and returns the outcome.
- **The key is never committed.** It is in user-secrets on a laptop and the environment variable `Sms__ApiKey` on the servers.

## Alternatives considered
- **Africa's Talking:** also supports USSD, but the team's account, credit and approved sender ID are with Arkesel. USSD can still use Africa's Talking later, behind its own interface.
- **"Text everyone unless a list is set":** one forgotten setting on staging would text strangers. Defaulting to the list makes the safe choice the easy one.
- **Skip SMS whenever the fixed laptop code is on:** this protects laptops but not staging, and stops the team testing real SMS on a laptop.

## Consequences
- **Sign-in works on the deployed servers** as soon as each server has its key.
- **The DevOps lead needs to know:**
  - **Staging:** `Sms__ApiKey`, plus `Sms__OnlyTo__0` (and `__1`…) with the team's own numbers.
  - **Production:** `Sms__ApiKey` and `Sms__TextEveryone=true`.
  - The servers call `https://sms.arkesel.com`.
- **Every SMS costs credit,** and the balance is in the Arkesel dashboard.
- **Next:**
  - delivery reports (Arkesel can call back to say delivered or failed);
  - the officer's "Send advice by SMS";
  - farmers' confirmation texts.
