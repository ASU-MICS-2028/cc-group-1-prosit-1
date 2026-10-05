import "@testing-library/jest-dom/vitest"
import { cleanup, configure } from "@testing-library/react"
import { afterEach } from "vitest"
import i18n from "@/i18n"

// Pages are lazy chunks; the first one in a run is compiled on demand and can take over a second.
configure({ asyncUtilTimeout: 5000 })

afterEach(async () => {
  cleanup()
  localStorage.clear()
  await i18n.changeLanguage("en")
})
