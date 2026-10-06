import { describe, expect, it } from "vitest"
import i18n, { hasChosenLanguage, setLanguage } from "@/i18n"

describe("choosing a language", () => {
  it("has not chosen on a first visit", () => {
    expect(hasChosenLanguage()).toBe(false)
  })

  it("has chosen once a language is remembered", async () => {
    await setLanguage("tw")
    expect(hasChosenLanguage()).toBe(true)
  })

  it("previewing switches the app but does not count as choosing", async () => {
    await setLanguage("ee", false)
    expect(i18n.language).toBe("ee")
    expect(document.documentElement.lang).toBe("ee")
    expect(hasChosenLanguage()).toBe(false)
  })

  it("does not trap anyone on the first-run screen when storage is blocked", () => {
    const original = Storage.prototype.getItem
    Storage.prototype.getItem = () => {
      throw new Error("blocked")
    }
    try {
      expect(hasChosenLanguage()).toBe(true)
    } finally {
      Storage.prototype.getItem = original
    }
  })
})
