// Stand-in data for the screens whose backend is not built yet (mobile money, loans, insurance,
// the officer's money health and loan reviews). Every
// screen that uses it shows "Sample data". When an endpoint exists, the screen switches to it and
// the matching part of this file goes. Shapes follow the Figma screens so the API can mirror them.
import type { PictureSource } from "@/components/Picture"

/** "GH₵ 1,200" (whole cedis) or "GH₵ 6.80" when there are pesewas. */
export function cedis(amount: number) {
  const whole = Number.isInteger(amount)
  return `GH₵ ${amount.toLocaleString("en-GH", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

// ---------- The farmer's mobile money ----------

export const wallet = {
  provider: "MTN MoMo",
  number: "024 ••• 0000",
  name: "Ama Boateng",
}

export const providers = [
  "MTN MoMo",
  "Telecel Cash",
  "AirtelTigo Money",
] as const

export const transactions = [
  {
    id: "t1",
    who: "Tolon Agro Inputs",
    note: "waiting",
    amount: -545,
    when: "Today",
  },
  {
    id: "t2",
    who: "Savelugu buyer",
    note: "Maize, 6 bags",
    amount: 1200,
    when: "2 Oct",
  },
  {
    id: "t3",
    who: "Loan repayment",
    note: "Seed loan",
    amount: -100,
    when: "28 Sep",
  },
]

export interface InputProduct {
  code: string
  name: string
  unit: string
  price: number
  picture: PictureSource
}

export const inputs: readonly InputProduct[] = [
  {
    code: "maize_seed",
    name: "Maize seed (certified)",
    unit: "10 kg bag",
    price: 185,
    picture: { photo: "crops/maize.jpg", emoji: "ear-of-corn" },
  },
  {
    code: "npk",
    name: "NPK fertiliser 15-15-15",
    unit: "50 kg bag",
    price: 170,
    picture: { photo: "options/fertiliser", emoji: "bucket" },
  },
  {
    code: "urea",
    name: "Urea fertiliser",
    unit: "50 kg bag",
    price: 165,
    picture: { photo: "options/fertiliser", emoji: "bucket" },
  },
  {
    code: "sorghum_seed",
    name: "Sorghum seed",
    unit: "5 kg bag",
    price: 60,
    picture: { photo: "crops/sorghum.jpg", emoji: "sheaf-of-rice" },
  },
]

export interface Shop {
  id: string
  name: string
  distance: string
  delivery: string
  fee: number | null
}

export const shops: readonly Shop[] = [
  {
    id: "tolon",
    name: "Tolon Agro Inputs",
    distance: "3 km",
    delivery: "tomorrow",
    fee: 20,
  },
  {
    id: "savelugu",
    name: "Savelugu Farm Centre",
    distance: "9 km",
    delivery: "in 2 days",
    fee: 35,
  },
  {
    id: "tamale",
    name: "Tamale Agro Mart",
    distance: "24 km",
    delivery: "pick up only",
    fee: null,
  },
]

export const loanOffer = {
  max: 800,
  choices: [200, 400, 600, 800],
  feeRate: 0.05,
  payBack: "After harvest, by Feb 2027",
}

export const insurance = {
  premium: 30,
  crop: "Maize, 2.5 acres",
  season: "2026 rainy season",
  payout: 600,
  reference: "AGC-INS-26-0418",
}

// ---------- The officer ----------

export type RequestKind = "crop" | "loan" | "order"

export interface FarmerRequest {
  id: string
  farmer: string
  place: string
  kind: RequestKind
  title: string
  via: string
  when: string
  answered: boolean
  guess?: string
  advice?: string
  picture?: PictureSource
}

export const requests: readonly FarmerRequest[] = [
  {
    id: "r1",
    farmer: "Hawa Issah",
    place: "Tolon",
    kind: "crop",
    title: "Possible fall armyworm on maize",
    via: "photo",
    when: "40 min ago",
    answered: false,
    guess: "Fall armyworm, about 8 in 10 chance",
    advice:
      "Check 20 plants. Crush egg masses by hand. If more than 2 in 10 plants are damaged, I will visit this week.",
    picture: { photo: "options/pests", emoji: "bug" },
  },
  {
    id: "r2",
    farmer: "Salifu Iddrisu",
    place: "Kumbungu",
    kind: "crop",
    title: "Yellow leaves on maize",
    via: "voice note",
    when: "2 h ago",
    answered: false,
    guess: "Nitrogen shortage, about 6 in 10 chance",
    advice:
      "Side-dress with urea, one bottle cap per plant, after the next rain.",
    picture: { photo: "crops/maize.jpg", emoji: "ear-of-corn" },
  },
  {
    id: "r3",
    farmer: "Abiba Seidu",
    place: "Kumbungu",
    kind: "loan",
    title: "Help with seed loan application",
    via: "app",
    when: "Yesterday",
    answered: true,
  },
  {
    id: "r4",
    farmer: "Tolon Women Cooperative",
    place: "Tolon",
    kind: "order",
    title: "Approve group order: 120 bags NPK",
    via: "app",
    when: "Yesterday",
    answered: false,
  },
]

export const moneySummary = {
  district: "Savelugu district",
  month: "October",
  paidToDealers: 48200,
  activeLoans: 62,
  insured: 140,
  problems: 9,
  weeks: [8100, 11400, 12900, 15800],
}

export const cropProblems = [
  {
    name: "Possible fall armyworm",
    where: "Maize · 5 farms",
    status: "visiting",
  },
  { name: "Leaf spot", where: "Groundnut · 3 farms", status: "confirmed" },
  { name: "Streak virus", where: "Maize · 1 farm", status: "urgent" },
] as const

export type LoanStatus = "review" | "approved" | "declined"

export interface LoanApplication {
  id: string
  farmer: string
  amount: number
  acres: number
  status: LoanStatus
  reasons: string[]
  caution?: string
}

export const loans: readonly LoanApplication[] = [
  {
    id: "l1",
    farmer: "Ama Boateng",
    amount: 800,
    acres: 2.5,
    status: "review",
    reasons: [
      "Registered farm: 2.5 acres, location and photo",
      "2 extension visits this year",
      "GH₵ 4,300 crop sales by MoMo in 6 months",
    ],
    caution: "No previous loan to check repayment",
  },
  {
    id: "l2",
    farmer: "Issah Abdulai",
    amount: 600,
    acres: 2,
    status: "review",
    reasons: ["Registered farm: 2 acres", "1 extension visit this year"],
    caution: "Crop sales by MoMo: none recorded",
  },
  {
    id: "l3",
    farmer: "Kwame Mensah",
    amount: 1000,
    acres: 4,
    status: "approved",
    reasons: [],
  },
  {
    id: "l4",
    farmer: "Abiba Seidu",
    amount: 500,
    acres: 1.5,
    status: "approved",
    reasons: [],
  },
  {
    id: "l5",
    farmer: "Salifu Iddrisu",
    amount: 900,
    acres: 1,
    status: "declined",
    reasons: [],
  },
]

export const marketPrices = [
  {
    crop: "Maize",
    picture: { photo: "crops/maize.jpg", emoji: "ear-of-corn" },
    tamale: 6.77,
    savelugu: 6.62,
    change: 0,
  },
  {
    crop: "Groundnut",
    picture: { photo: "crops/groundnut.jpg", emoji: "peanuts" },
    tamale: 14.57,
    savelugu: 14.23,
    change: 2,
  },
  {
    crop: "Sorghum",
    picture: { photo: "crops/sorghum.jpg", emoji: "sheaf-of-rice" },
    tamale: 6.81,
    savelugu: 7.52,
    change: 1,
  },
  {
    crop: "Rice",
    picture: { photo: "crops/rice.jpg", emoji: "sheaf-of-rice" },
    tamale: 12.21,
    savelugu: 11.53,
    change: 0,
  },
  {
    crop: "Yam",
    picture: { photo: "crops/yam.jpg", emoji: "sweet-potato" },
    tamale: 5.66,
    savelugu: 6.09,
    change: 0,
  },
  {
    crop: "Cassava",
    picture: { photo: "crops/cassava.jpg", emoji: "potato" },
    tamale: 3.23,
    savelugu: 3.3,
    change: 2,
  },
] as const
