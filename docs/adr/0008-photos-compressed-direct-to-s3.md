# ADR 0008: Photos compressed on the phone and uploaded straight to S3

- **Status:** Accepted
- **Date:** 2026-10-04

## Context
Phone photos are 3-5 MB. Farmers pay for data, and our API runs on a t3.micro with 1 GiB of RAM.

## Decision
- Compress on the phone with **browser-image-compression** (Web Worker, fixes EXIF rotation) to about 150 KB before upload. The library is lazy-loaded at the camera step.
- The API issues a **presigned S3 URL**; the phone uploads directly to a **private** S3 bucket. Photos never stream through the API.

## Alternatives considered
- **Upload full size and resize on the server:** the farmer has already paid for the full upload, and it would load the small API instance.

## Consequences
- Roughly 95% less data per photo.
- The API stays small and cheap. Server-side thumbnails can be added later (S3 event → Lambda).
