# ADR 0013: Backend: ASP.NET Core 10, OpenAPI contract

- **Status:** Accepted (the layering below is superseded by ADR 0020; the rest stands)
- **Date:** 2026-10-04

## Context
The backend must serve the whole project, not just Week 1: farmer registration and sync (Week 1), countries, currencies, weather and mobile money (Weeks 2-3), and AI (Week 4). It runs on a t3.micro (1 GB RAM) next to other containers, and must hand the PWA a typed contract.

## Decision
- **ASP.NET Core 10 (LTS)** Minimal API, **EF Core + Npgsql** for Postgres.
- Structure: services as class libraries behind a thin API host (see ADR 0020; this ADR first chose Clean Architecture layers).
- Built-in OpenAPI (`AddOpenApi()` / `MapOpenApi()`); the document is generated on build to `backend/openapi/agroconnect.json` and committed as the contract. Enums serialised as strings; nullable reference types on.

## Alternatives considered
- **Java / Spring Boot:** equally mature, but a typical Spring Boot service needs 250 MB+ of RAM versus roughly 50-100 MB for .NET 10, which matters on a 1 GB instance. No capability we need that .NET lacks.
- **Python (FastAPI/Django):** the strongest choice for training our own ML models, but slower, weaker typing, and less careful money handling (`decimal` is native in C#) across Weeks 1-3. Not worth that trade for one part of Week 4.
- **Node/Express (as in the course labs):** viable and light, but weaker for money and transactional work than C#, and no advantage for AI.
- **.NET 8:** support ends November 2026.

## Week 4 (AI) plan
- Hosted models (an LLM for advice, AWS Bedrock, Ghana NLP Khaya for Twi/Ewe/Dagbani speech and translation) are API calls; the C# API calls them directly (Microsoft.Extensions.AI / official SDKs).
- If we train our own models (e.g. crop disease from photos), they run as a **separate small Python service**. A model would not fit in the API's memory on the t3.micro anyway, so this split is needed whatever the core language. This is the usual pattern at scale: one core service, ML kept separate.

### C# vs Java for AI
Roughly even. Both have official SDKs for OpenAI, Anthropic and AWS Bedrock; mature AI frameworks (C#: Microsoft.Extensions.AI, Semantic Kernel; Java: Spring AI, LangChain4j); pgvector for RAG on our Postgres; ONNX Runtime for running pre-trained models (ML.NET / DJL). Shared weaknesses versus Python: examples and research code are Python-first, new SDK features land in Python/TypeScript first, and training models is impractical in either. AI therefore does not decide C# vs Java; it only decides whether a separate Python service is added.

## Consequences
- The frontend runs `npm run gen:api` to regenerate `src/api/schema.d.ts`; a renamed field becomes a compile error, not a production bug.
- **Test framework:** xUnit 2.9.3, not xunit.v3. On the .NET 10 SDK xunit.v3 runs on Microsoft.Testing.Platform, which the `coverlet.msbuild` coverage gate in our CI does not support. Revisit when coverage tooling for the new platform is stable.
