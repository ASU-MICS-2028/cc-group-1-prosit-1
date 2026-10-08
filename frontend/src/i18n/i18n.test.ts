import { beforeEach, describe, expect, it } from "vitest"
import i18n, { LANGUAGES, setLanguage } from "@/i18n"
import ee from "./locales/ee.json"
import en from "./locales/en.json"
import tw from "./locales/tw.json"

const translations: Record<string, object> = { tw, ee }

/** "a": { "b": "x" } becomes "a.b": "x". */
function flatten(
  tree: object,
  prefix = "",
  flat: Record<string, string> = {}
): Record<string, string> {
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === "string") flat[prefix + key] = value
    else flatten(value as object, `${prefix}${key}.`, flat)
  }
  return flat
}

describe("i18n", () => {
  beforeEach(async () => {
    await setLanguage("en")
    localStorage.clear()
  })

  it("lists the four supported languages", () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(["en", "tw", "ee", "dag"])
  })

  it("defaults to English", () => {
    expect(i18n.t("welcome.hello")).toBe("Hello,")
  })

  it("speaks Twi and Ewe", async () => {
    await setLanguage("tw")
    expect(i18n.t("welcome.choose")).toBe("Paw wo kasa")
    await setLanguage("ee")
    expect(i18n.t("welcome.choose")).toBe("Tia wò gbe")
  })

  it("falls back to English for a language with no translation yet", async () => {
    await setLanguage("dag")
    expect(i18n.language).toBe("dag")
    expect(i18n.t("welcome.hello")).toBe("Hello,")
  })

  it("translates every English text into each ready language, keeping its placeholders", () => {
    const placeholders = (text: string) =>
      (text.match(/\{\{\s*[\w.]+\s*\}\}/g) ?? []).sort()
    const english = flatten(en)
    const problems: string[] = []
    for (const { code } of LANGUAGES.filter(
      (l) => l.ready && l.code !== "en"
    )) {
      const bundle = flatten(translations[code])
      for (const [key, text] of Object.entries(english)) {
        if (!bundle[key]) problems.push(`${code}: ${key} is missing`)
        else if (placeholders(bundle[key]).join() !== placeholders(text).join())
          problems.push(`${code}: ${key} changes its placeholders`)
      }
    }
    expect(problems).toEqual([])
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
