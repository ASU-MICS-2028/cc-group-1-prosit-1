# ADR 0023: Database naming (snake_case) and enforced links (foreign keys)

- **Status:** Accepted
- **Date:** 2026-10-05

## Context
The first migration used the C# property names as column names (`"FullName"`, `"PhoneE164"`). It did not tell the database how tables link (a visit's farmer, a farmer's registering officer), so only the API code kept those links correct.

Two problems followed:
- **Quotes:** in PostgreSQL, mixed-case names must be quoted in every query (`select "FullName" from users`). That makes reports, ad-hoc SQL and other tools awkward for the data lead, MoFA analysts and anyone new.
- **Unprotected links:** a bug, a manual edit or a future service writing to the same database could create a visit for a farmer that does not exist, and nothing would stop it.

The migration had not been committed or deployed, so changing both cost one regenerated migration. Later, each change would need its own migration on live data.

## Decision
- **snake_case database names:** every table, column, key and index is lower-case snake_case (`full_name`, `ix_farmers_phone_e164`, `fk_visits_farmers_farmer_id`). The mapping is done once in `AppDbContext` (`UseSnakeCaseNames`); C# keeps its own names.
- **Foreign keys for every link between rows**, with `RESTRICT` on delete (a row that others point at cannot be deleted by accident). There are six:

| Constraint | Link |
|---|---|
| `fk_farmers_users_registered_by_id` | `farmers.registered_by_id` → `users.id` |
| `fk_users_farmers_farmer_id` | `users.farmer_id` → `farmers.id` |
| `fk_visits_farmers_farmer_id` | `visits.farmer_id` → `farmers.id` |
| `fk_visits_users_officer_id` | `visits.officer_id` → `users.id` |
| `fk_photos_farmers_farmer_id` | `photos.farmer_id` → `farmers.id` |
| `fk_photos_users_uploaded_by_id` | `photos.uploaded_by_id` → `users.id` |

- **Two links are deliberately not foreign keys:** `farmers.photo_id` and `visits.photo_ids`. Offline, a farmer or visit syncs **before** its photo is uploaded, so the photo row does not exist yet. A list column also cannot carry a foreign key. The API checks these links instead.

## Alternatives considered
- **Keep the C# names:** no work now, but quotes forever in SQL and reports.
- **The `EFCore.NamingConventions` package:** does the same mapping. Ours is about 30 lines with no extra dependency or version to track.
- **No foreign keys (the API checks everything):** simpler sync ordering, but integrity then depends on every piece of code being right, now and in future services.
- **`CASCADE` deletes:** deleting an officer would silently delete their farmers and visits. `RESTRICT` makes such a delete an explicit decision.

## Consequences
- SQL is plain: `select full_name from farmers;`. The data dictionary lists every name.
- The database refuses broken links whatever program writes to it; `tests/Api.Tests/DatabaseSchemaTests.cs` proves it.
- **Sync must save in link order:** a phone sends farmers before their visits, and the server saves farmers first within a batch. The sync design already does this.
- **Deleting a farmer** (for example, on a Data Protection Act request) needs a deliberate process for their visits and photos. To be designed with the data-retention policy.
- The migration tool's own table keeps its name, `"__EFMigrationsHistory"`.
