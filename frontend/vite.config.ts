import path from "path"
import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // React Compiler: auto-memoizes components so we don't hand-write useMemo/useCallback
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  // `npm run dev`: send /api to the backend on this machine (dotnet run, port 8000),
  // the same path nginx forwards on the servers, so the app code is identical everywhere.
  server: {
    proxy: { "/api": "http://localhost:8000" },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
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
