# ADR 0007: Authentication by phone number

- **Status:** Proposed (demo uses a fixed test OTP)
- **Date:** 2026-10-04

## Context
The brief asks: phone-number verification or national ID (Ghana Card)? Every target user has, or shares, a phone number; not all carry or remember a Ghana Card number.

## Decision
Identify users by **phone number** with a one-time code sent by SMS (Africa's Talking). For the Week 1 demo, agents log in with a phone number and a fixed test OTP; real SMS OTP follows.

## Alternatives considered
- **Ghana Card / national ID:** stronger identity, but integration requires government agreements and excludes people without the card at hand. Kept as an optional profile field for later verification.

## Consequences
- Works on every phone type; the same number identifies the farmer on USSD.
- Shared family phones are common: one number may link to several farmer profiles, handled in the data model.
