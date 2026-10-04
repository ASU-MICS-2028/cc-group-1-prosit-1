# AgroConnect frontend: why each choice, and how to defend it

Every pick below answers four questions: **why this**, **what we rejected**, **what it costs the farmer** (download size on 2G), and **what changes at scale**. You can copy this almost directly into `docs/adr/`.

Rule behind all of it: **the farmer pays for every kilobyte** (paid 2G data, cheap Android phones). A library earns its place only if it does something hard that we'd otherwise get wrong.

---

### vite-plugin-pwa (Workbox underneath)
- **Why:** generates the service worker and manifest from config, with Google's Workbox doing the caching. Workbox is the industry standard; hand-written service workers are the #1 source of "users stuck on an old version" bugs.
- **Rejected:** hand-writing `sw.js` (the brief's sample code). Fine for learning, risky for production: cache versioning and update flow are easy to get wrong.
- **Cost to farmer:** small; the service worker is a separate file loaded once.
- **At scale:** stays. If we need custom logic (e.g. background photo upload), we switch to its `injectManifest` mode and write our own worker on top of Workbox, without changing tools.

### Dexie (IndexedDB)
- **Why:** offline-first is a brief requirement. IndexedDB is the only browser storage big enough for photos and structured enough to query; Dexie makes it usable (schema versions, indexes, transactions) and `useLiveQuery` makes the UI react to local changes.
- **Rejected:** `localStorage` (5 MB, text only, blocks the UI thread); `idb` (tiny but low-level, we'd rebuild what Dexie gives us); full sync engines like RxDB, PowerSync or ElectricSQL (powerful, but heavier and add a vendor or server component we don't need in Week 1).
- **At scale:** the outbox pattern we build is the same pattern those sync engines use. If conflict handling grows complex (many agents editing one farmer), we can move to one of them without changing the UI layer.

### i18next + react-i18next
- **Why:** the most widely used React translation stack. Handles fallbacks (missing Dagbani string → English, never a blank), interpolation, plurals, and **loading one language at a time**, so a Twi speaker never downloads Ewe text.
- **Rejected:** `react-intl`/FormatJS (strong, but built around ICU message syntax that's harder for non-developer translators); hand-rolled JSON lookups (no fallbacks or lazy loading).
- **At scale:** adding Yoruba and Swahili in Week 2 is adding two JSON files. Translators can later work in a hosted tool (e.g. Crowdin, Weblate) that exports the same JSON.
- **Honest caveat:** no library translates for us. Twi, Ewe and Dagbani text must be written and checked by native speakers; the audio prompts are recorded by people, not generated.

### react-hook-form + zod (+ @hookform/resolvers)
- **Why:** react-hook-form keeps inputs uncontrolled, so typing doesn't re-render the whole wizard on a slow phone. Zod defines each rule once (Ghana phone format, required fields, farm size > 0) and gives us the TypeScript type from the same schema.
- **Rejected:** Formik (re-renders more, less actively maintained); Yup (similar to zod, weaker TypeScript inference).
- **Version:** use **zod v4**. It's faster and smaller than v3, and `zod/mini` is available if bundle size gets tight.
- **At scale:** validation rules can be shared with any future Node services; the .NET API validates again on its side (never trust the client).

### browser-image-compression
- **Why:** a phone photo is 3 to 5 MB; on 2G that's minutes and real money. Compressing on the phone to ~150 KB before upload is the single biggest data saving in the app. The library runs in a Web Worker (UI stays responsive) and fixes photo rotation from EXIF data, which is a classic bug.
- **Rejected:** uploading full size and resizing on the server (the farmer already paid for the upload); writing our own canvas resize (about 40 lines and possible, but we'd also have to handle EXIF rotation and worker threading ourselves).
- **Cost to farmer:** we **lazy-load** it, so it downloads only when someone opens the camera step.
- **At scale:** add server-side thumbnails later (S3 upload triggers a Lambda) for dashboards. Phone-side compression stays.

### shadcn/ui (Base UI + Tailwind)
- **Why:** components are **copied into our code**, not installed as a dependency, so we ship only what we use and can change anything. Base UI underneath gives keyboard and screen-reader accessibility. We chose Base UI over Radix because it is shadcn's recommended default and actively developed by the people behind Radix, MUI and Floating UI, while Radix's development has slowed. shadcn itself is familiar from MTN; the only API difference you'll notice is a `render` prop where Radix used `asChild`.
- **Rejected:** MUI and Ant Design (large bundles, harder to make look simple for low-literacy users); building everything from scratch (accessibility is easy to get wrong).
- **At scale:** the copied components become our own design system (big touch targets, icons, high contrast) that cooperatives' local instances can reuse.

### react-router-dom
- **Why:** standard, you know it, and it supports lazy-loading each page so the first screen loads fast.
- **Rejected:** TanStack Router (excellent type safety, but new for the team today with no Week 1 payoff).

### openapi-typescript (dev only, nothing shipped)
- **Why:** the biggest risk between `frontend/` and `backend/` is the frontend and API disagreeing about a field. Types generated from the API's OpenAPI document turn that into a compile error before deploy.

### Deliberately left out (and why that's defensible)
| Left out | Why |
|---|---|
| Redux | Local data lives in Dexie; server data goes through the sync engine. A third state store adds weight and bugs. |
| TanStack Query | Not needed while reads come from Dexie. Add it when we build online-only screens (dashboards, market prices in Week 2). |
| moment.js | Large and in maintenance mode; the browser's `Intl` formats dates in every locale for free. |
| Module Federation / microfrontends | Extra network round-trips at load time and harder offline caching. Right for MTN's many teams, wrong for a 2G farmer app. |
| React Native / Flutter | App-store install, larger downloads, and a second codebase. The brief specifies a PWA; feature phones are covered by USSD. |

### Budget to state in the write-up
- Initial JavaScript under **~200 KB gzipped**, checked with `vite build` output and a Lighthouse run on simulated slow 3G.
- Everything not needed on the first screen (camera, compression, farmer list) is lazy-loaded.

### Vitest + Testing Library + jsdom (dev only, nothing shipped)
- **Why:** unit tests and a 70% line-coverage gate are mandatory in CI (CONTRIBUTING.md, ADR 0019). Vitest reuses the Vite config (same `@/` alias and plugins), so there is no second toolchain; Testing Library tests behaviour (what the user sees) rather than implementation.
- Coverage (v8) excludes vendored shadcn components, `main.tsx` and type files. `npm run test:ci` writes `coverage/coverage-summary.json`, which CI reads.

### Prettier (dev only)
- **Why:** one formatting style without review debates; enforced by the pre-commit hook and `npm run format:check` in CI (ADR 0018).
