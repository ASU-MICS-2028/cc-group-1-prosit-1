import path from "path"
import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import { defineConfig } from "vitest/config"

const BRAND_GREEN = "#007e2f"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // React Compiler: auto-memoizes components so we don't hand-write useMemo/useCallback
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    // The installable, offline app (ADR 0028). Only `npm run build` makes the service worker;
    // test it with `npm run preview` (docs/local-development.md 5.10).
    VitePWA({
      // Ask before switching to a new version: never reload under an officer mid-registration.
      registerType: "prompt",
      manifest: {
        id: "/",
        name: "AgroConnect Ghana",
        short_name: "AgroConnect",
        description:
          "Register farmers and connect them with extension services, even without internet.",
        lang: "en",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: BRAND_GREEN,
        background_color: "#fdfdfd",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Saved on install: every page's code, styles, the small icons and the language files,
        // so the whole app opens offline. Pictures are not (ADR 0025): see runtimeCaching.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        globIgnores: ["illustrations/**", "app-icon.svg"],
        // Any address opened offline (/farmers, /register?step=3) gets the app, which routes it.
        navigateFallback: "/index.html",
        // ...except the API and its test pages, which must always go to the server.
        navigateFallbackDenylist: [/^\/api\//, /^\/swagger/, /^\/health/],
        runtimeCaching: [
          {
            // Pictures: downloaded when first shown, then kept for offline use (ADR 0025)
            urlPattern: ({ url }) => url.pathname.startsWith("/illustrations/"),
            handler: "CacheFirst",
            options: {
              cacheName: "pictures",
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  // `npm run dev`: send /api to the backend on this machine (dotnet run, port 8000),
  // the same path nginx forwards on the servers, so the app code is identical everywhere.
  server: {
    // API_PROXY_TARGET points it at another API, e.g. a second copy on port 8001 while 8000 is busy.
    proxy: { "/api": process.env.API_PROXY_TARGET ?? "http://localhost:8000" },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Pages are lazy chunks compiled on first use; under a full parallel run that can pass 5 s.
    testTimeout: 15_000,
    css: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      // shadcn primitives are vendored code; entry/types/tests are not logic
      exclude: [
        "src/components/ui/**",
        "src/main.tsx",
        "src/**/*.d.ts",
        "src/test/**",
        "src/**/*.test.{ts,tsx}",
      ],
    },
  },
})
