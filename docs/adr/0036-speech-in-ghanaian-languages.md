# ADR 0036: Speaker buttons in Twi, Ewe and Dagbani through GhanaNLP Khaya

- **Status:** Accepted
- **Date:** 2026-10-08

## Context
The speaker buttons and *Listen* used the phone's own voice. Phones have no Twi, Ewe or Dagbani voices, so in those languages the app read the text in an English accent, or read English.

Google Cloud Text-to-Speech does not support Twi, Ewe or Dagbani. Google Translate only translates Twi and Ewe as text.

GhanaNLP's Khaya API translates English into Twi, Ewe and Dagbani, and speaks all three.

## Decision
**A SpeechService:**
- `GET /api/speech?lang=tw|ee|dag&text=<English sentence>` returns the sentence spoken in that language.
- On the server: it translates with Khaya Translation v2 `POST /v2/translate` (`{"in", "lang": "en-tw"}`), then speaks with Text-To-Speech v2 `POST /tts/v2/synthesize` (`{"text", "language": "twi"}`, WAV). Version 1 of both APIs is deprecated, so the app uses v2. When subscribing on the Khaya portal, choose **Translation API v2** and **Text-To-Speech API v2**.
- The base URL is `https://translation-api.ghananlp.org`, with the key in the `Ocp-Apim-Subscription-Key` header.

**Each sentence is made once:**
- `speech_clips` keeps the audio, the English text and Khaya's translation, keyed by language and a hash of the text.
- Native speakers can review the translations from that table.
- Responses carry a 30-day cache header, so phones and CloudFront keep them too.

**Open without sign-in**, because the language picker speaks before anyone signs in. Three limits keep the paid key from being drained:
- 60 requests a minute per address;
- 500 characters at most;
- only the three languages.

**The secret key:**
- `Khaya__ApiKey` on the servers, `Khaya:ApiKey` in user-secrets on a laptop.
- Without it the endpoint says "not available" (404).

**The app's order of voices:**
1. a recorded prompt (ADR 0014) when one exists;
2. Khaya for Twi, Ewe and Dagbani;
3. the phone's own voice, always for English.

**Two ways to play:**
- Speaker buttons play and stop on one tap, with no overlay.
- Long listening (details, profiles, lessons, voice notes) uses the Playing overlay.

## Alternatives considered
- **Google Cloud TTS:** no voice for any of the three languages.
- **Recording every prompt by hand:** best quality, and still the plan (ADR 0014). It needs native speakers and time; Khaya covers the gap now and adds every new sentence by itself.

## Consequences
**The team needs to:**
- create a Khaya account and an API key (developer.khaya.ai);
- give the key to the DevOps lead to put on the servers.

Until then the app uses the phone's voice, as before.

Machine translation can be wrong, so native speakers should review the `speech_clips` translations before a wide launch.
