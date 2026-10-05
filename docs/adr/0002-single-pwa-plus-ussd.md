# ADR 0002: One Progressive Web App, plus USSD for feature phones

- **Status:** Accepted
- **Date:** 2026-10-04

## Context
Farmers: 70% basic smartphones, 25% feature phones, 5% no phone. Data is expensive and connectivity intermittent. The brief specifies a PWA that works offline.

## Decision
Build **one React PWA** (installable from Chrome, works offline) for smartphone users and extension agents, and serve feature-phone users through **USSD/SMS** (Africa's Talking). No native app, no microfrontends.

## Alternatives considered
- **React Native / Flutter:** app-store install, larger downloads, and a second codebase; no reach to feature phones anyway.
- **Microfrontends (Module Federation):** right for large organisations with many teams (e.g. MTN), but adds runtime network requests and makes offline caching harder. Wrong trade-off for a 2G farmer app.

## Consequences
- One codebase covers phones, tablets and the desktop admin view.
- Updates reach users on next open; no app-store approval.
- iOS PWA support is weaker; acceptable since most target devices are Android.
