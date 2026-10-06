# ADR 0024: Roles, how accounts are made, and which device each role uses

- **Status:** Accepted
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

| Who | Entry | Screens |
|---|---|---|
| Extension officer, farmer | The main link | Phone: Welcome → Language → *Who are you?* (Extension officer / Farmer) → phone → code. Computer: Language → *Who are you?* (same two choices) → phone → code |
| Farmer on a computer | The main link | Picking *Farmer* on a computer shows *Farmers use AgroConnect on the phone*, with a QR code and the link, and goes no further |
| MoFA admin | **A separate page, `/admin`** | Admin sign-in → code → admin overview. Not offered on the main *Who are you?* screen |
| MoFA admin on a phone | `/admin` on a phone | *Admin works on a computer*, with the admin link and a button back to the main page |

**The device rule uses screen width, not the user agent:** under 768 px counts as a phone, the same breakpoint as ADR 0021.

**Unknown numbers:** as ADR 0022 requires, the server answers "send code" the same way whether or not the number has an account, and sends no SMS if it has none. The screen says: "If this number is registered, a code is on its way. No code? Ask your extension officer" (farmer) or "Ask your MoFA admin" (officer, admin).

**Design:** Figma file *AgroConnect*. Desktop page: P1 · D02a Who Are You, D02 Extension officer log in, D02f Farmer on a Computer; P4 · D0 Admin Sign In, D0b Admin Enter Code, D2b Add a Person. Phone page: P1 · 01b Who Are You, P4 · 00 Admin on a Phone. All linked in the prototype.

## Alternatives considered
- **One sign-in page with a "MoFA admin" choice:** simpler to build, but farmers and officers would see an option that is not for them, and some would pick it by mistake.
- **No device restrictions, only a "this page is easier on a computer" notice:** keeps everyone in, but the farmer screens are built for phones only, and a farmer on a computer would get a broken experience.
- **Officers on the phone only:** officers also work from district-office laptops, so blocking the computer would lock them out of their own records.
- **A fourth "district office" role:** adds a role with no clear difference from a district-scoped admin.
- **Self sign-up for officers:** anyone could claim to be an officer and see farmers' personal data.

## Consequences
- **Backend:** needs an `admin` role (today only `officer` and `farmer` exist), an endpoint for admins to add officers and admins that sends the SMS invite, and a script to create the first admin.
- **Frontend:** needs the `/admin` sign-in, the farmer-on-a-computer screen, the admin-on-a-phone screen and the *Add a person* form. Routes still follow the role (guards), and the device check is a width check on top.
- **Farmers without a smartphone** cannot use a cyber-café computer instead. They keep USSD, SMS and their officer.
- **Admins** get a separate address to share with MoFA staff; it should not be linked from the farmer and officer screens beyond one small line.
