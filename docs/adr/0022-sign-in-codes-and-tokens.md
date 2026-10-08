# ADR 0022: Sign-in details: SMS codes, tokens and limits

- **Status:** Accepted
- **Date:** 2026-10-05

## Context
ADR 0007 chose phone number + one-time SMS code. Building it needed concrete numbers, which the concise plan (4 October) set at a 5-minute code and a 15-minute token.

**Why those numbers do not fit:**
- **The network:** SMS on 2G can arrive after several minutes.
- **The officers:** they work offline for days in places with no signal. A 15-minute token would sign them out in the field, where they cannot receive a new code.

**What the rules must also do:**
- Protect against guessing.
- Avoid revealing who has an account.
- Keep codes safe if the database leaks.

## Decision

| Rule | Value | Why |
|---|---|---|
| Code | 6 digits, random | One in a million per guess |
| Code lifetime | **10 minutes** | SMS can be slow on 2G |
| Resend | Once every **45 seconds**, at most **20 codes an hour** per phone and role, laptops and servers alike (raised from 5 on 2026-10-08: 5 blocked people who mistyped or lost signal a few times, and blocked team testing) | Stops SMS flooding and cost abuse; matches "Resend code in 0:45" on the screen |
| Wrong tries | **5** per code, then a new code is needed | Guessing a 6-digit code in 5 tries is about 1 in 200,000 |
| Storage | Only an HMAC-SHA256 hash of phone + code, keyed with the server secret | A leaked table reveals no codes; a hash cannot be reused for another phone |
| "Send code" answer | Always `202`, whether or not the number has an account | Nobody can test numbers to find out who is registered |
| Per network address | **30** sign-in requests per 5 minutes | Slows scripted attacks while a shared office connection still works |
| Token | Signed JWT (HS256) with the user ID, role (`officer`, `farmer`) and, for farmers, their farmer ID | The server checks it without a database lookup, and it works while the phone is offline |
| Token lifetime | **7 days** on the servers (setting `Auth:TokenLifetime`, default `7.00:00:00`); **1 hour** on laptops (`appsettings.Development.json`) so the sign-in screens are tested often | Covers a week of field work between trips to signal; limits the damage of a lost phone to a week |
| Farmer accounts | Created on first sign-in from the farmer record an officer registered; on a shared family phone, the first farmer registered on it | Farmers need no separate sign-up |
| Signing key | At least 32 bytes, from `Auth__SigningKey` on the server; the API refuses to start without it | Secrets never in the code (ADR 0015) |
| Laptop and tests | Fixed code `123456`; the SMS text is written to the log | Development without an SMS account |

All values are settings (`Auth` section) and can be tuned per environment without code changes.

## Alternatives considered
- **15-minute token with a refresh token:** standard for online apps, but a refresh still needs signal. An offline officer would be stuck after 15 minutes, or would hold a long-lived refresh token, which is the same risk with more parts.
- **30-day token:** fewer sign-ins, but a lost phone stays signed in for a month. Rejected by the team in favour of 7 days.
- **5-minute code:** too short when SMS arrives late on 2G.
- **Telling the user "this number is not registered":** friendlier, but lets anyone check who has an account.
- **Passwords:** forgotten often and shared; low-literacy users struggle with them.

## Consequences
- Officers sign in about once a week, when they have signal.
- **A token cannot be cancelled from the server before it expires.** Signing out removes it from the phone. A "sign out everywhere" switch (a per-user token version checked on sync) is a planned improvement.
- The SMS sender is a swappable provider: Africa's Talking replaces the log-only sender without changing the sign-in code. (Update 2026-10-08: Arkesel is the provider, ADR 0037.)
- The sign-in limits are tested in `tests/AuthService.Tests` (expiry, lockout, resend, hourly cap, unknown numbers, shared phones).
