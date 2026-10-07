// The answers on the registration screens. The codes are exactly the API's words for the
// backend code lists (FarmerEnums.cs, docs/data-dictionary.md section 5), so what the phone saves
// is what the server stores. The label is a key in the language files; `icon` is a file in public/icons.

export const GENDERS = ["female", "male", "other", "prefer_not_to_say"] as const
export const AGE_BANDS = ["18-25", "26-35", "36-50", "over_50"] as const
export const CROPS = [
  { code: "maize", icon: "wheat" },
  { code: "sorghum", icon: "wheat" },
  { code: "rice", icon: "sprout" },
  { code: "groundnut", icon: "bean" },
  { code: "yam", icon: "carrot" },
  { code: "cassava", icon: "carrot" },
] as const
export const AREA_UNITS = ["acres", "hectares"] as const
export const SOILS = ["sandy", "clay", "loamy", "not_sure"] as const
export const SEASONS = [
  { code: "rainy", icon: "rain" },
  { code: "dry", icon: "sun" },
] as const
export const PHONE_TYPES = [
  { code: "smartphone", icon: "smartphone" },
  { code: "basic_phone", icon: "phone" },
  { code: "no_phone", icon: "x" },
] as const
export const DATA_PURCHASES = ["daily", "weekly", "monthly", "none"] as const
export const CHANNELS = [
  { code: "sms", icon: "message" },
  { code: "ussd", icon: "hash" },
  { code: "call", icon: "phone" },
  { code: "app", icon: "smartphone" },
] as const
export const INCOME_SOURCES = [
  { code: "crops", icon: "wheat" },
  { code: "animals", icon: "tractor" },
  { code: "trading", icon: "banknote" },
  { code: "other", icon: "shovel" },
] as const
export const BANK_ANSWERS = [
  { code: "yes", icon: "bank" },
  { code: "no", icon: "x" },
] as const
export const MOBILE_MONEY = ["yes", "no", "skip"] as const
export const LAST_VISITS = [
  "never",
  "this_year",
  "last_year",
  "longer_ago",
] as const
export const HELP_NEEDS = [
  { code: "seeds", icon: "sprout" },
  { code: "fertiliser", icon: "droplets" },
  { code: "pests", icon: "shovel" },
  { code: "market_prices", icon: "banknote" },
  { code: "weather", icon: "sun" },
  { code: "loans", icon: "wallet" },
] as const

export type Gender = (typeof GENDERS)[number]
export type AgeBand = (typeof AGE_BANDS)[number]
export type Crop = (typeof CROPS)[number]["code"]
export type AreaUnit = (typeof AREA_UNITS)[number]
export type Soil = (typeof SOILS)[number]
export type Season = (typeof SEASONS)[number]["code"]
export type PhoneType = (typeof PHONE_TYPES)[number]["code"]
export type DataPurchase = (typeof DATA_PURCHASES)[number]
export type Channel = (typeof CHANNELS)[number]["code"]
export type IncomeSource = (typeof INCOME_SOURCES)[number]["code"]
export type MobileMoney = (typeof MOBILE_MONEY)[number]
export type LastVisit = (typeof LAST_VISITS)[number]
export type HelpNeed = (typeof HELP_NEEDS)[number]["code"]
