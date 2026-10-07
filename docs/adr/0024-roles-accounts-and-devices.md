# ADR 0024: Roles, how accounts are made, and which device each role uses

- **Status:** Accepted, amended 2026-10-06 (desktop sign-in choice) and 2026-10-07 (farmers on a computer); see the *Amendments*
- **Date:** 2026-10-05

## Context
ADR 0021 made the layout responsive: bottom bar on phones, sidebar from 768 px. It did not say which roles may use which device, who creates each account, or how a MoFA administrator signs in. Earlier drafts also listed a "district office" role that no document defines.

The team needed one answer to three questions:
- **Who are the roles,** and what does each one do?
- **How does each person get an account?** Nobody should be able to sign themselves up as an officer or an admin.
- **Where does each role sign in,** on a phone, a computer, or both?

## Decision

**Three roles.** "District office" is not a role: it is a MoFA admin whose access covers one region or district.

| Role | What they do | How the account is made | Devices |
|---|---|---|---|
| **MoFA admin** | See summaries for their region; add and remove extension officers; turn off a lost phone; reports | The **first admin is created by the team** with a one-off script on the server. After that, an admin adds other admins on the *Add a person* page (role: admin) | **Computer only** |
| **Extension officer** | Register farmers, record visits, sync | A **MoFA admin adds them** on the *Add a person* page (name, phone, region, district). They get an SMS invite | **Phone and computer**, both full: phone layout on a phone, sidebar layout on a computer, same features |
| **Farmer** | See their own details, prices, weather, help | An **extension officer registers them** with their phone number. The account is created at first sign-in (ADR 0022). No self sign-up | **Phone only** |

Farmers with a basic phone use USSD and SMS; farmers with no phone are handled by their officer (unchanged, see `data-dictionary.md` 2.2).

**Where each role signs in.** Everyone uses phone number + 6-digit SMS code (ADR 0007, 0022). No passwords.

| Who | Device | Screens |
|---|---|---|
| Extension officer, farmer | Phone (under 768 px) | Welcome → Language → *Who are you?* (**Extension officer / Farmer**) → phone → code. A small line tells MoFA admins to use a computer |
| Extension officer, MoFA admin | Computer (768 px and up) | Language → *Who are you?* (**Extension officer / MoFA admin**) → phone → code. The admin choice leads to the admin sign-in, then the admin overview |
| Farmer on a computer | Computer | Not offered on the desktop *Who are you?*. A small line, "Farmer? The farmer app works on your phone", opens *Farmers use AgroConnect on the phone* with a QR code and the link, and goes no further |
| MoFA admin on a phone | Phone | *Admin works on a computer*, with a button back to the main page |

**The device rule uses screen width, not the user agent:** under 768 px counts as a phone, the same breakpoint as ADR 0021.

**Unknown numbers:** as ADR 0022 requires, the server answers "send code" the same way whether or not the number has an account, and sends no SMS if it has none. The screen says: "If this number is registered, a code is on its way. No code? Ask your extension officer" (farmer) or "Ask your MoFA admin" (officer, admin).

**Design:** Figma file *AgroConnect*. Desktop page: P1 · D02a Who Are You (Extension officer / MoFA admin), D02 Extension officer log in, D02f Farmer on a Computer; P4 · D0 Admin Sign In, D0b Admin Enter Code, D2b Add a Person. Phone page: P1 · 01b Who Are You, P4 · 00 Admin on a Phone. All linked in the prototype.

## Alternatives considered
- **A separate `/admin` page, not offered on *Who are you?*** (the first version of this ADR): keeps the admin option away from everyone else, but MoFA staff would need a second address. Replaced on 2026-10-06 (see *Amendment*).
- **No device restrictions, only a "this page is easier on a computer" notice:** keeps everyone in, but the farmer screens are built for phones only, and a farmer on a computer would get a broken experience.
- **Officers on the phone only:** officers also work from district-office laptops, so blocking the computer would lock them out of their own records.
- **A fourth "district office" role:** adds a role with no clear difference from a district-scoped admin.
- **Self sign-up for officers:** anyone could claim to be an officer and see farmers' personal data.

## Consequences
- **Backend:** needs an `admin` role (today only `officer` and `farmer` exist), an endpoint for admins to add officers and admins that sends the SMS invite, and a script to create the first admin.
- **Frontend:** the *Who are you?* screen shows different choices by screen width (phone: Extension officer / Farmer; computer: Extension officer / MoFA admin); plus the admin sign-in, the farmer-on-a-computer screen, the admin-on-a-phone screen and the *Add a person* form. Routes still follow the role (guards), and the device check is a width check on top.
- **Farmers without a smartphone** cannot use a cyber-café computer instead. They keep USSD, SMS and their officer.
- **Admins** get a separate address to share with MoFA staff; it should not be linked from the farmer and officer screens beyond one small line.

## Amendment (2026-10-06): the desktop sign-in choice

The DevOps lead changed where MoFA admins choose their role. *Who are you?* now offers different choices by screen width:

- **Phone:** Extension officer or Farmer (unchanged).
- **Computer:** Extension officer or MoFA admin. Farmers are phone only, so a farmer choice on a computer would only lead to a dead end; they get one small line pointing to the phone instead.

The separate `/admin` page is dropped: admins use the same address as everyone else and pick *MoFA admin* on a computer. The device rule is still the 768 px width check, never the user agent. Everything else in this ADR (three roles, who creates each account, devices per role, unknown-number handling) is unchanged.

## Amendment (2026-10-07): farmers on a computer too

Farmers are no longer phone only. A farmer who travels to town and signs in on a laptop, or in a cyber café, gets the same app in the computer layout, exactly like an extension officer: **the screen width picks the layout, the role picks the menus** (team rule "Phone vs Desktop").

- **Under 768 px:** the farmer's phone design with the bottom bar (Home, Help, Profile).
- **From 768 px:** the sidebar with the same places, and wider pages (the farmer's Home in two columns, Profile in two columns).
- ***Who are you?*** keeps **Farmer** at every width. On a computer it will also offer **MoFA admin** once the admin sign-in exists.
- The *Farmers use AgroConnect on the phone* screen (D02f) is no longer needed.

**Why:** farmers do reach computers (district offices, cyber cafés, a relative's laptop), and turning them away to a phone they may not have with them helps nobody. One responsive app already serves both sizes, so this costs no extra screens.

**Still true:** MoFA admins remain computer only (their pages are dashboards); farmers without a smartphone still have USSD, SMS and their officer.
