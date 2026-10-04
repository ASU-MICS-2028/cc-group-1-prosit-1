# ADR 0009: Hosting: S3 + CloudFront for the PWA, EC2 for the API

- **Status:** Accepted (CloudFront setup planned)
- **Date:** 2026-10-04

## Context
PWAs require HTTPS. The EC2 instance has only a bare IP and is in Cape Town; users are in Ghana.

## Decision
- The built PWA is hosted on **S3 behind CloudFront**, which provides free HTTPS and serves files from edge locations, including Lagos.
- `/api/*` is routed through the same CloudFront distribution to the **EC2** API, so the app and API share one HTTPS origin (no CORS complexity, no mixed-content errors).
- Until CloudFront is set up, a reverse proxy on EC2 serves both for development.

## Alternatives considered
- **Caddy on EC2 with an sslip.io hostname:** quickest HTTPS, but every request travels to Cape Town. Kept as a fallback.

## Consequences
- App shell loads from a nearby edge; after first load it is served from the phone's cache anyway.
- Later, the API scales horizontally behind an Application Load Balancer across two availability zones (Lab 2 plan) without touching the frontend.
