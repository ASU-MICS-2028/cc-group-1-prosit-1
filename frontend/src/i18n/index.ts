import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import en from "./locales/en.json"

// Each language is written in itself (docs/adr/0014). `sub` is the name an
// English speaker knows it by, shown smaller under the native name.
export const LANGUAGES = [
  { code: "en", label: "English", sub: "English" },
  { code: "tw", label: "Twi", sub: "Akan" },
  { code: "ee", label: "Eʋegbe", sub: "Ewe" },
  { code: "dag", label: "Dagbanli", sub: "Dagbani" },
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

/** True once the person has picked a language (the first-run screen is shown until then). */
export function hasChosenLanguage(): boolean {
  try {
    return isLanguage(localStorage.getItem(STORAGE_KEY))
  } catch {
    return true // storage is blocked: do not trap them on the first-run screen
  }
}

/**
 * Switches the app language. With `remember: false` it only previews the language
 * (the first-run screen does this while the farmer listens and compares).
 */
export async function setLanguage(code: LanguageCode, remember = true) {
  if (code !== "en" && !i18n.hasResourceBundle(code, "translation")) {
    const bundle = await loaders[code]()
    i18n.addResourceBundle(code, "translation", bundle.default)
  }
  await i18n.changeLanguage(code)
  document.documentElement.lang = code
  if (!remember) return
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
