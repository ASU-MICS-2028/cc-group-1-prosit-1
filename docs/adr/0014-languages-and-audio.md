# ADR 0014: Languages and audio prompts

- **Status:** Accepted
- **Date:** 2026-10-04

## Context
Users speak English, Twi, Ewe and Dagbani; literacy in the Northern partner districts is low.

## Decision
- **i18next** with one JSON file per language, loaded on demand, falling back to English when a string is missing.
- A 🔊 button on every question plays a **recorded** clip (`public/audio/{lang}/{key}.mp3`) that shares its key with the text.
- Translations and recordings are made and checked by **native speakers**; machine translation (e.g. GhanaNLP Khaya) may only produce drafts.

## Alternatives considered
- **Text-to-speech:** poor quality for Twi, Ewe and Dagbani.

## Consequences
- Adding Yoruba and Swahili in Week 2 is adding files, not code.
- Audio is cached by the service worker so prompts work offline.
