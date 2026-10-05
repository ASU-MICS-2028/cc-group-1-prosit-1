# ADR 0020: Backend structure: services as class libraries behind a thin API host

- **Status:** Accepted (replaces the layering in ADR 0013; the rest of 0013 stands)
- **Date:** 2026-10-04

## Context
ADR 0013 chose Clean Architecture (Domain, Application, Infrastructure, Api), and the first scaffold followed it. Bernard's company already builds its backends differently and the team knows that layout well: one class library per service, a shared library, and a thin API host. The project also has a stated modular future (Stage 3 of the roadmap: cut services out one at a time). Layers by technical role (all farmers code spread over four projects) fit that cut worse than folders by feature (all farmers code in one project).

The company's version is built on private compiled packages (`Acs.GenericApi.*`) from a private NuGet feed. Our CI cannot restore them and a public repo should not depend on them, so the structure is adopted but the framework is rewritten on plain ASP.NET Core.

## Decision
```
backend/
  APIs/agroconnect-api/         thin host: Program.cs, logging, errors, OpenAPI. No business logic.
  Services/
    PlatformService/            health, supported languages (the pattern every service follows)
    <X>Service/                 later: Farmer, Sync, Auth, Media, Ussd
      Features/                 one class per use case
      Models/                   request and response types
      Providers/                Interfaces/ and Implementations/ (data access, SMS, storage)
      Langs/                    en.json (tw, ee, dag added with the translations)
      <X>ServiceExtension.cs    AddXService(): registers its providers and features
    Libs/SharedLibrary/         enums, PhoneNumber, feature base, ApiException, messages, session, masking, clock
    Libs/Data/                  AppDbContext and EF Core migrations (one PostgreSQL database for now)
  tests/
    Shared/                     [UnitTest] / [IntegrationTest] traits and small helpers
    <X>Service.Tests/           mirrors the service: Features/ and test helpers
    Api.Tests/                  the whole API in memory plus a real PostgreSQL (Testcontainers)
```

- **Feature base (ours, about 40 lines):** a feature is a class that implements `IFeature` and maps its own route; its handler takes what it needs as parameters, so unit tests call it directly. Services register features with `AddFeature<T>()` and the host calls `MapFeatures()` once.
- **Messages in the caller's language:** text lives in `Langs/*.json` keyed by message key; the caller's language comes from the `X-Language` header (`en`, `tw`, `ee`, `dag`); missing translations fall back to English, then to the key. Features throw `ApiException(status, key)` and one handler returns RFC 9457 problem details in the caller's language.
- **Session provider** (`ISessionProvider`): language and current user id, so features never read the HTTP request.
- **Data masking helpers** for anything personal that has to be shown to someone who does not need all of it. Logs carry ids only.
- **Database:** EF Core migrations (not stored procedures, which the company uses) so the schema is versioned in Git and tested against a real PostgreSQL. One shared database now, split per service later.
- Assemblies and namespaces are `AgroConnect.<Folder>` (set once in `Directory.Build.props`); project folders keep short names.

## Alternatives considered
- **Keep Clean Architecture:** well known and defensible, and nothing was wrong with it. Rejected because the team knows the company layout, it matches the modular roadmap, and four projects per feature area is more ceremony than a feature folder for a 4-day build.
- **Use the company's packages as they are:** impossible for CI (private feed), and a public repo would depend on a private one.
- **One project with folders:** simplest, but gives up the compile-time boundary between services that makes later extraction cheap.
- **MediatR or a similar library for use cases:** one more dependency for what a class with one method already does.

## Consequences
- Adding a service is: a class library with the folders above, an `AddXService()`, one line in `Program.cs`, one test project.
- Services depend on SharedLibrary and, when they need the database, on Data. They never reference each other; if two need to talk, the shared piece moves into SharedLibrary or becomes an HTTP call when split out.
- The business rules (sync conflict rule, phone parsing) live in the service or SharedLibrary and are plain C# with unit tests; no framework needed to test them.
- Coverage is gated per test project at 70% on the code that project is about.
- Translations in Twi, Ewe and Dagbani must come from native speakers; until then those languages fall back to English.
