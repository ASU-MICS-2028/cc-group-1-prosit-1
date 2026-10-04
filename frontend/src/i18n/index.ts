import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import en from "./locales/en.json"

// Each language is written in itself (docs/adr/0014).
export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "tw", label: "Twi" },
  { code: "ee", label: "Eʋegbe" },
  { code: "dag", label: "Dagbanli" },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]["code"]

// English ships in the main bundle (it is the fallback); every other language
// is its own chunk, downloaded only when the user picks it.
const loaders: Record<
  Exclude<LanguageCode, "en">,
  () => Promise<{ default: Record<string, unknown> }>
> = {
  tw: () => import("./locales/tw.json"),
  ee: () => import("./locales/ee.json"),
  dag: () => import("./locales/dag.json"),
}

const STORAGE_KEY = "agroconnect.lang"

function isLanguage(value: string | null): value is LanguageCode {
  return LANGUAGES.some((l) => l.code === value)
}

function readSavedLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(saved)) return saved
  } catch {
    // storage can be blocked; fall back to English
  }
  return "en"
}

export async function setLanguage(code: LanguageCode) {
  if (code !== "en" && !i18n.hasResourceBundle(code, "translation")) {
    const bundle = await loaders[code]()
    i18n.addResourceBundle(code, "translation", bundle.default)
  }
  await i18n.changeLanguage(code)
  document.documentElement.lang = code
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    // ignore: the choice just won't be remembered
  }
}

void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false }, // React already escapes
})

const saved = readSavedLanguage()
if (saved !== "en") void setLanguage(saved)

export default i18n
