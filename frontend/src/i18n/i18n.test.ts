import { beforeEach, describe, expect, it } from "vitest"
import i18n, { LANGUAGES, setLanguage } from "@/i18n"

describe("i18n", () => {
  beforeEach(async () => {
    await setLanguage("en")
    localStorage.clear()
  })

  it("lists the four supported languages", () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(["en", "tw", "ee", "dag"])
  })

  it("defaults to English", () => {
    expect(i18n.t("home.title")).toBe("Welcome to AgroConnect")
  })

  it("falls back to English for a language with no translation yet", async () => {
    await setLanguage("tw")
    expect(i18n.language).toBe("tw")
    expect(i18n.t("home.title")).toBe("Welcome to AgroConnect")
  })

  it("remembers the choice and sets the html lang attribute", async () => {
    await setLanguage("ee")
    expect(localStorage.getItem("agroconnect.lang")).toBe("ee")
    expect(document.documentElement.lang).toBe("ee")
  })

  it("still switches language when storage is blocked", async () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error("blocked")
    }
    try {
      await setLanguage("dag")
      expect(i18n.language).toBe("dag")
    } finally {
      Storage.prototype.setItem = original
    }
  })
})
