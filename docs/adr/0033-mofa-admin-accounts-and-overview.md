# ADR 0033: MoFA admin accounts, their area, and the Overview

- **Status:** Accepted
- **Date:** 2026-10-08

## Context
ADR 0024 decided three roles: MoFA admins add extension officers and see reports for their region, and admins use a computer only. The admin sign-in screen was built, but the server knew only officers and farmers. The screen therefore said "Admin accounts are not switched on yet", and nobody could sign in as an admin.

Figma has the admin sidebar (*Sidebar Nav (Phase 4, MoFA admin)*): Overview, Regions, Agents, Cooperatives, Help desk, Impact and System. At the bottom it shows the signed-in admin and their area ("Esi Owusu · MoFA, Northern Region").

## Decision
- **A third role, `admin`.** Admins sign in like officers: phone number, then a 6-digit SMS code. The token carries `role: admin`, and admin endpoints require the `admin` policy. Roles are stored as numbers (`0` officer, `1` farmer, `2` admin), so the new role needed **no database change**.
- **Accounts are made for admins and officers, never by signing in.** Only a farmer account is created at first sign-in, from the farmer record. An officer's number asking for an admin code gets no SMS and no account.
- **An admin's area is their region and district** (the existing `region` and `district` columns):
  - a region only: the whole region;
  - region and district: that district only;
  - neither: national, every region.
- **A new backend service, AdminService.** `GET /api/admin/overview` returns live data for the admin's area:
  - the number of extension officers;
  - farmers registered (all, and this month);
  - visits this month;
  - one line per officer: district, farmers, this month's farmers and visits, and **last sync** (the latest record the server stored from them).
- **Admin pages in the app** live under `/admin`, beside the Figma admin sidebar:
  - "MoFA admin" under the logo; the admin's card and Log out at the bottom.
  - On a phone, the same address shows "Admin works on a computer" with Log out.
  - Each sidebar place joins the menu when its page exists, so no item leads to an empty page. Today: **Overview**. Next: **Agents** with *Add a person*.
- **Demo admin on laptops:** Esi Owusu, `024 000 0009`, Northern Region (`Seed:Admins` in `appsettings.Development.json`).

## Alternatives considered
- **Passwords for admins:** a second sign-in method to build, reset and secure. The SMS code already works and admins have phones.
- **A separate admin app:** planned later as a module in a shell (micro-frontends). For now one app keeps one sign-in, one build and one deployment.
- **Admins see every region:** simpler, but a regional office should see only its own officers and farmers.

## Consequences
- MoFA admins can sign in and see their area today, with live numbers.
- **The DevOps lead needs to know:**
  - The first admin on the servers must be created by the team with a one-off script (still to write). `Seed:Admins` is for laptops and the staging demo only.
  - The settings list has a new optional entry, `Seed:Admins`.
- Next (Bernard): *Add a person* (admins add officers and admins, with an SMS invite), then the reports page (D20), then Regions, Cooperatives, Help desk, Impact and System.
