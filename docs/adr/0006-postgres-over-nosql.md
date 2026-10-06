# ADR 0006: PostgreSQL for farmer data

- **Status:** Proposed (Data lead to confirm)
- **Date:** 2026-10-04

## Context
The brief asks us to choose SQL or NoSQL. Farmer data is relational: a farmer has farms, photos, extension visits and a financial profile, and MoFA needs reporting across regions.

## Decision
Use **PostgreSQL** (Amazon RDS if our credits cover it in af-south-1, otherwise Postgres in Docker on the EC2 host for Week 1, moving to RDS later). Use `jsonb` columns for the few fields that vary by region or season.

## Alternatives considered
- **DynamoDB / MongoDB:** flexible schemas, but reporting joins (farmers by district, crop and channel) are harder, and our sync rule needs reliable transactions.

## Consequences
- Strong consistency and transactions for idempotent batch upserts.
- PostGIS is available later for farm-location queries.
- Sharding by country (Week 2) can be done with separate databases per country for data-sovereignty compliance.
- RDS cost in af-south-1 must be checked against the $5 budget before provisioning.
