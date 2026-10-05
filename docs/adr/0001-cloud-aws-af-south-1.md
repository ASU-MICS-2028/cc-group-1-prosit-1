# ADR 0001: Cloud platform: AWS, Africa (Cape Town) af-south-1

- **Status:** Accepted (Lab 1, 2026-09-22; region confirmed Lab 2, 2026-09-27)
- **Date:** 2026-10-04

## Context
The brief asks us to choose and justify a cloud platform (AWS/Azure/GCP or African providers). Users are smallholder farmers in Ghana on intermittent 2G/3G.

## Decision
Use **AWS**, with compute and data in **af-south-1 (Cape Town)**.

## Alternatives considered
- **Azure (South Africa North):** priced within 1% of AWS for our workload and has longer student credit. Rejected mainly on team familiarity; we record this honestly as a bias, not a technical win.
- **GCP:** blocked by a USD 30 prepayment at billing setup from Ghana.
- **eu-west-1 (Ireland):** ~15% cheaper and a cleaner power grid, but 166-178 ms from Accra versus 116-136 ms for Cape Town (measured with cloudping.info).

## Consequences
- Lower latency for Ghanaian users; about $1.60/month more than Europe, accepted deliberately.
- af-south-1 is an opt-in region with narrower free-tier coverage, so we treat it as carrying real cost and keep a $5/month budget alert.
- Static files are served from CloudFront edge locations (see 0009), so the farmer-facing latency is better than the region alone.
