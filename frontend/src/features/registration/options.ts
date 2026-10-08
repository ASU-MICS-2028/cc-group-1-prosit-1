// The answers on the registration screens. The codes are exactly the API's words for the
// backend code lists (FarmerEnums.cs, docs/data-dictionary.md section 5), so what the phone saves
// is what the server stores. The label is a key in the language files; `picture` is the Figma photo
// (public/pictures) with the emoji that stands in for it offline (public/emoji, ADR 0025).

export const GENDERS = ["female", "male", "other", "prefer_not_to_say"] as const
export const AGE_BANDS = ["18-25", "26-35", "36-50", "over_50"] as const
export const CROPS = [
  {
    code: "maize",
    picture: { photo: "crops/maize.jpg", emoji: "ear-of-corn" },
  },
  {
    code: "sorghum",
    picture: { photo: "crops/sorghum.jpg", emoji: "sheaf-of-rice" },
  },
  {
    code: "rice",
    picture: { photo: "crops/rice.jpg", emoji: "sheaf-of-rice" },
  },
  {
    code: "groundnut",
    picture: { photo: "crops/groundnut.jpg", emoji: "peanuts" },
  },
  { code: "yam", picture: { photo: "crops/yam.jpg", emoji: "sweet-potato" } },
  { code: "cassava", picture: { photo: "crops/cassava.jpg", emoji: "potato" } },
] as const
export const AREA_UNITS = ["acres", "hectares"] as const
export const SOILS = ["sandy", "clay", "loamy", "not_sure"] as const
export const SEASONS = [
  {
    code: "rainy",
    picture: { photo: "options/rainy", emoji: "cloud-with-rain" },
  },
  { code: "dry", picture: { photo: "options/dry", emoji: "sun" } },
] as const
export const PHONE_TYPES = [
  {
    code: "smartphone",
    picture: { photo: "options/phone", emoji: "mobile-phone" },
  },
  {
    code: "basic_phone",
    picture: { photo: "options/nokia", emoji: "telephone" },
  },
  {
    code: "no_phone",
    picture: { photo: "options/no-phone", emoji: "no-mobile-phones" },
  },
] as const
export const DATA_PURCHASES = ["daily", "weekly", "monthly", "none"] as const
export const CHANNELS = [
  { code: "sms", picture: { photo: "options/sms", emoji: "speech-balloon" } },
  { code: "ussd", picture: { photo: "options/nokia", emoji: "input-numbers" } },
  {
    code: "call",
    picture: { photo: "options/phone", emoji: "telephone-receiver" },
  },
  {
    code: "app",
    picture: { photo: "options/phone", emoji: "mobile-phone-arrow" },
  },
] as const
export const INCOME_SOURCES = [
  { code: "crops", picture: { photo: "options/corn", emoji: "ear-of-corn" } },
  { code: "animals", picture: { photo: "options/goat", emoji: "goat" } },
  {
    code: "trading",
    picture: { photo: "options/trading", emoji: "handshake" },
  },
  {
    code: "other",
    picture: { photo: "options/other-work", emoji: "hammer-and-wrench" },
  },
] as const
export const BANK_ANSWERS = [
  { code: "yes", picture: { photo: "options/bank", emoji: "bank" } },
  { code: "no", picture: { photo: "options/wallet", emoji: "cross-mark" } },
] as const
export const MOBILE_MONEY = ["yes", "no", "skip"] as const
export const LAST_VISITS = [
  "never",
  "this_year",
  "last_year",
  "longer_ago",
] as const
export const HELP_NEEDS = [
  { code: "seeds", picture: { photo: "options/sprout", emoji: "seedling" } },
  {
    code: "fertiliser",
    picture: { photo: "options/fertiliser", emoji: "bucket" },
  },
  { code: "pests", picture: { photo: "options/pests", emoji: "bug" } },
  {
    code: "market_prices",
    picture: { photo: "options/coins", emoji: "chart-increasing" },
  },
  {
    code: "weather",
    picture: { photo: "options/umbrella", emoji: "sun-behind-rain-cloud" },
  },
  { code: "loans", picture: { photo: "options/cedi", emoji: "money-bag" } },
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
