# AgroConnect backend

ASP.NET Core 10 (C#) API. Services are class libraries behind a thin API host (ADR 0020).

```
APIs/agroconnect-api/      thin host: Program.cs, logging, errors, OpenAPI, MapFeatures()
Services/
  PlatformService/         health and supported languages: the pattern every service follows
    Features/              one class per use case
    Models/                request and response types
    Providers/             Interfaces/ and Implementations/ (data access, SMS, storage)  [when needed]
    Langs/                 en.json, later tw/ee/dag                                     [when needed]
    PlatformServiceExtension.cs   AddPlatformService()
  Libs/SharedLibrary/      enums, PhoneNumber, IFeature, ApiException, messages, session, masking, clock
  Libs/Data/               AppDbContext and EF Core migrations (PostgreSQL)
tests/
  Shared/                  [UnitTest] / [IntegrationTest] traits, ApiAssert
  <Service>.Tests/         unit tests, mirror the service folders
  Api.Tests/               the API in memory plus a real PostgreSQL (Testcontainers)
openapi/agroconnect.json   generated on build and committed: the contract the frontend reads
```

## Add a feature

A feature is one class. It maps its route and its handler takes what it needs as parameters, so a test can call the handler directly.

```csharp
public sealed class GetFarmer : IFeature
{
    public void MapEndpoint(IEndpointRouteBuilder app) =>
        app.MapGet("/api/farmers/{id:guid}", Handle).WithName("GetFarmer").WithTags("Farmers");

    public static async Task<Ok<FarmerDto>> Handle(Guid id, IFarmerProvider farmers, CancellationToken ct)
        => TypedResults.Ok(await farmers.Get(id, ct) ?? throw new ApiException(404, "FARMER_NOT_FOUND"));
}
```

Register it in the service's `AddXService()` with `.AddFeature<GetFarmer>()`. Put the text for `FARMER_NOT_FOUND` in the service's `Langs/en.json` and add the service's assembly with `AddMessages(...)`. The caller's language comes from the `X-Language` header (`en`, `tw`, `ee`, `dag`).

## Add a service

1. Class library `Services/<X>Service/` (copy `PlatformService.csproj`), folders as above, `AddXService()`.
2. Add `.AddXService()` to `Program.cs` and a project reference from the API.
3. Test project `tests/<X>Service.Tests/` (copy `PlatformService.Tests.csproj`, set `<Include>[AgroConnect.<X>Service]*</Include>`).
4. `dotnet sln add --solution-folder Services Services/<X>Service/<X>Service.csproj` (and the same for the tests).

## Run it

Needs the .NET 10 SDK and Docker.

```
cd backend
docker compose -f docker-compose.dev.yml up -d db          # PostgreSQL on localhost:5433
dotnet run --project APIs/agroconnect-api                  # http://localhost:8000
```

Set the database connection for local runs (never commit it):

```
dotnet user-secrets --project APIs/agroconnect-api set "ConnectionStrings:Default" "Host=localhost;Port=5433;Database=agroconnect;Username=agroconnect;Password=agroconnect_dev"
```

Check it: `http://localhost:8000/health` returns 200 with `"database": "Healthy"`; `http://localhost:8000/languages` lists the four languages; `http://localhost:8000/openapi/v1.json` shows the API description (Development only).

Or run everything in containers: `docker compose -f docker-compose.dev.yml --profile api up --build`. Copy `.env.example` to `.env` to change the compose settings.

## Check it (same as CI)

```
dotnet restore
dotnet format --verify-no-changes --no-restore
dotnet build --no-restore -c Release
dotnet test --no-restore -c Release /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura /p:CoverletOutput=./coverage/ /p:Threshold=70 /p:ThresholdType=line /p:ThresholdStat=total
```

Only the fast tests: `dotnet test --filter Category=Unit`. Integration tests start a PostgreSQL container, so Docker must be running (the first run pulls the image).

## Conventions

- NuGet versions live only in `Directory.Packages.props`; shared compiler settings in `Directory.Build.props` (warnings are errors, nullable on). Assemblies and namespaces are `AgroConnect.<folder name>`.
- Test framework is xUnit 2.9.3. xunit.v3 on the .NET 10 SDK runs on Microsoft.Testing.Platform, which the coverlet.msbuild coverage gate in CI does not support yet; revisit when it does.
- Mocks: NSubstitute. Name tests as sentences (`Falls_back_to_english_when_the_language_has_no_translation`).
- Errors are RFC 9457 problem details. Logs are structured JSON in non-Development environments and never contain personal data (ids only; mask anything else with `DataMaskingHelper`).
- A service never references another service. Shared code goes in SharedLibrary.
- Change the database only through EF Core migrations (added with the farmer model).
