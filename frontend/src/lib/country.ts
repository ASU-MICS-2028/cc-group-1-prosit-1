import { useSyncExternalStore } from "react"
import type { LanguageCode } from "@/i18n"

// The farmer's or officer's country (Figma P2 · 01 Choose your country): it sets the money, the
// languages offered and where the data is kept. Ghana is live. Nigeria and Kenya are designed and
// shown, but come in a later phase: the server, phone numbers and data store are Ghana's for now.

export const COUNTRIES = [
  {
    code: "GH",
    name: "Ghana",
    currency: "Ghana cedi",
    unit: "Cedi",
    symbol: "GH₵",
    languages: ["en", "tw", "ee", "dag"],
    dataStore: "Ghana data store",
    available: true,
  },
  {
    code: "NG",
    name: "Nigeria",
    currency: "Nigerian naira",
    unit: "Naira",
    symbol: "₦",
    languages: ["en", "yo"],
    dataStore: "Nigeria data store",
    available: false,
  },
  {
    code: "KE",
    name: "Kenya",
    currency: "Kenyan shilling",
    unit: "Shilling",
    symbol: "KSh",
    languages: ["en", "sw"],
    dataStore: "Kenya data store",
    available: false,
  },
] as const

export type CountryCode = (typeof COUNTRIES)[number]["code"]
export type Country = (typeof COUNTRIES)[number]

/** Languages a country will offer that the app does not speak yet (shown as "later phase"). */
export const LATER_LANGUAGES = [
  { code: "yo", label: "Yorùbá", sub: "Yoruba", country: "NG" },
  { code: "sw", label: "Kiswahili", sub: "Swahili", country: "KE" },
] as const

export function countryOf(code: CountryCode): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0]
}

export function speaks(country: Country, language: LanguageCode) {
  return (country.languages as readonly string[]).includes(language)
}

// ---------- Saved choices (this device) ----------

const COUNTRY_KEY = "agroconnect.country"
const UNIT_KEY = "agroconnect.areaUnit"
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null // storage blocked: defaults apply
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage blocked: the choice lasts until the page closes
  }
  notify()
}

export function getCountry(): CountryCode {
  const saved = read(COUNTRY_KEY)
  return COUNTRIES.some((c) => c.code === saved && c.available)
    ? (saved as CountryCode)
    : "GH"
}

export function setCountry(code: CountryCode) {
  if (countryOf(code).available) write(COUNTRY_KEY, code)
}

export function hasChosenCountry() {
  return read(COUNTRY_KEY) !== null
}

export function useCountry(): Country {
  return countryOf(useSyncExternalStore(subscribe, getCountry, () => "GH"))
}

export type AreaUnit = "acres" | "hectares"

/** The unit farm sizes start in when registering (Country and money · Farm size in). */
export function getAreaUnit(): AreaUnit {
  return read(UNIT_KEY) === "hectares" ? "hectares" : "acres"
}

export function setAreaUnit(unit: AreaUnit) {
  write(UNIT_KEY, unit)
}

export function useAreaUnit(): AreaUnit {
  return useSyncExternalStore(subscribe, getAreaUnit, () => "acres")
}
