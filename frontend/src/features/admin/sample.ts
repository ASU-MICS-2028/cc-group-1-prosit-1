// Stand-in data for the MoFA admin pages whose backend is not built yet (Figma P4 · D2 to D6 and D20).
// Every page that uses it shows "Sample data". Overview is live (AdminService); when an endpoint exists
// for one of these pages, the page switches to it and its part of this file goes. The shapes follow the
// Figma frames so the API can mirror them.

/** P1 · D20 MoFA Reports, shown under Regions */
export const regionReport = {
  region: "Northern Region",
  registered: 1248,
  womenPercent: 46,
  womenTarget: 40,
  ussdPercent: 22,
  newThisWeek: 86,
  districts: [
    { name: "Tolon", farmers: 312 },
    { name: "Savelugu", farmers: 286 },
    { name: "Kumbungu", farmers: 241 },
    { name: "Tamale Metro", farmers: 198 },
    { name: "Yendi", farmers: 211 },
  ],
  languages: [
    { name: "Dagbani", farmers: 612, app: 70 },
    { name: "Twi", farmers: 301, app: 85 },
    { name: "English", farmers: 247, app: 92 },
    { name: "Ewe", farmers: 88, app: 80 },
  ],
}

export type Access = "active" | "checkIn" | "phoneLost" | "off"

export interface Agent {
  id: string
  name: string
  phone: string
  district: string
  farmers: number | null
  lastSync: string
  role: "officer" | "admin"
  access: Access
}

/** P4 · D2 Agents and Access */
export const agents: readonly Agent[] = [
  {
    id: "a1",
    name: "Fuseini Alhassan",
    phone: "+233240000001",
    district: "Savelugu",
    farmers: 312,
    lastSync: "Today 08:14",
    role: "officer",
    access: "active",
  },
  {
    id: "a2",
    name: "Kofi Asante",
    phone: "+233240000003",
    district: "Tolon",
    farmers: 286,
    lastSync: "Yesterday",
    role: "officer",
    access: "active",
  },
  {
    id: "a3",
    name: "Abena Darko",
    phone: "+233240000004",
    district: "Kumbungu",
    farmers: 241,
    lastSync: "3 days ago",
    role: "officer",
    access: "checkIn",
  },
  {
    id: "a4",
    name: "Ibrahim Musah",
    phone: "+233240000005",
    district: "Tamale Metro",
    farmers: 198,
    lastSync: "12 days ago",
    role: "officer",
    access: "phoneLost",
  },
  {
    id: "a5",
    name: "Esi Owusu",
    phone: "+233240000009",
    district: "Region office",
    farmers: null,
    lastSync: "Today 09:02",
    role: "admin",
    access: "active",
  },
]
export const agentTotal = 61

export type PhoneProblem = "lost" | "stolen" | "broken"
export type ReportedVia = "app" | "call" | "sms" | "inPerson"

/** A lost, stolen or broken phone, reported by the agent (Profile, from another phone) or for them. */
export interface PhoneReport {
  agentId: string
  problem: PhoneProblem
  via: ReportedVia
  when: string
  /** Farmers saved on that phone but not sent: listed so another agent can re-visit them */
  unsent: number
}

export const phoneReports: readonly PhoneReport[] = [
  {
    agentId: "a4",
    problem: "stolen",
    via: "call",
    when: "Today 07:40",
    unsent: 4,
  },
]

/** P4 · D3 System Health */
export const systemHealth = {
  environment: "Production · af-south-1",
  uptime: 99.6,
  uptimeTarget: 99.5,
  p95Ms: 212,
  waitingOnPhones: 1084,
  failedDeploys: 0,
  services: [
    { name: "Web app (PWA)", detail: "nginx · 2 instances", ok: true },
    { name: "API", detail: "ASP.NET Core · 2 instances", ok: true },
    { name: "Database", detail: "PostgreSQL · RDS", ok: true },
    { name: "Photo storage", detail: "S3 · private bucket", ok: true },
    { name: "USSD and SMS", detail: "Africa's Talking", ok: false },
  ],
  alerts: [
    {
      title: "SMS delivery slower than usual",
      detail: "Africa's Talking · 12 min ago · watching",
      open: true,
    },
    {
      title: "Deploy passed health check",
      detail: "Production · today 07:30",
      open: false,
    },
    {
      title: "Disk 80% on staging",
      detail: "Staging · yesterday · fixed",
      open: false,
    },
  ],
}

export type OrderStatus = "open" | "delivered" | "quote"

/** P4 · D5 Cooperatives */
export const adminCooperative = {
  name: "Tolon Women Farmers Cooperative",
  members: 86,
  leader: "Mariama Alhassan",
  saved: 12400,
  ordersThisSeason: 3,
  soldTonnes: 18,
  orders: [
    {
      id: "o1",
      title: "NPK fertiliser · 120 bags",
      detail: "64 members joined · cheaper by 12% · closes Friday",
      status: "open" as OrderStatus,
    },
    {
      id: "o2",
      title: "Certified maize seed · 900 kg",
      detail: "Delivered 2 Oct · paid by MoMo",
      status: "delivered" as OrderStatus,
    },
    {
      id: "o3",
      title: "Tarpaulins · 40",
      detail: "Waiting for dealer price",
      status: "quote" as OrderStatus,
    },
  ],
  sale: {
    buyer: "Savelugu Grain Traders",
    price: 6.8,
    market: 6.5,
    tonnes: 20,
    pledged: 18,
    pledgedBy: 41,
  },
}

/** P4 · D6 Impact and SDG report */
export const impact = {
  season: "2026",
  tiles: [
    { value: "44%", label: "Women farmers · SDG 5 (target 40%)" },
    { value: "+18%", label: "Average maize harvest · SDG 2" },
    { value: "+GH₵ 210", label: "Monthly income per farmer · SDG 1" },
    { value: "1,120", label: "Farmers insured against drought · SDG 13" },
  ],
  practices: [
    { name: "Certified seed", percent: 62 },
    { name: "Early pest checks", percent: 48 },
    { name: "Planting after first rains", percent: 71 },
    { name: "Selling through cooperative", percent: 35 },
  ],
  handover: [
    {
      name: "Cooperative leaders trained to run their own reports",
      done: true,
    },
    { name: "Agents trained on the help desk", done: true },
    { name: "Code and guides published as open source", done: false },
    { name: "Each cooperative runs its own copy of the app", done: false },
  ],
}

// ---------- Overview extras (map, trend, business) ----------

export type DistrictHealth = "good" | "late" | "noOfficer"

/** Where the farmers are: one circle per district, at the district capital. */
export const districtMap: readonly {
  name: string
  lat: number
  lng: number
  farmers: number
  officers: number
  women: number
  lastSync: string
  health: DistrictHealth
}[] = [
  {
    name: "Tolon",
    lat: 9.431,
    lng: -1.064,
    farmers: 312,
    officers: 2,
    women: 48,
    lastSync: "Yesterday",
    health: "good",
  },
  {
    name: "Savelugu",
    lat: 9.624,
    lng: -0.825,
    farmers: 286,
    officers: 2,
    women: 44,
    lastSync: "Today",
    health: "good",
  },
  {
    name: "Kumbungu",
    lat: 9.567,
    lng: -0.951,
    farmers: 241,
    officers: 1,
    women: 51,
    lastSync: "3 days ago",
    health: "late",
  },
  {
    name: "Tamale Metro",
    lat: 9.401,
    lng: -0.839,
    farmers: 198,
    officers: 1,
    women: 39,
    lastSync: "12 days ago",
    health: "late",
  },
  {
    name: "Yendi",
    lat: 9.443,
    lng: -0.009,
    farmers: 211,
    officers: 0,
    women: 42,
    lastSync: "Officer left",
    health: "noOfficer",
  },
  {
    name: "Karaga",
    lat: 9.925,
    lng: -0.432,
    farmers: 74,
    officers: 1,
    women: 46,
    lastSync: "Today",
    health: "good",
  },
  {
    name: "Mion",
    lat: 9.383,
    lng: -0.29,
    farmers: 52,
    officers: 1,
    women: 40,
    lastSync: "Yesterday",
    health: "good",
  },
]

/** Farmers registered each month this season, against the plan. */
export const monthlyRegistrations: readonly {
  month: string
  farmers: number
  target: number
}[] = [
  { month: "May", farmers: 96, target: 150 },
  { month: "Jun", farmers: 184, target: 180 },
  { month: "Jul", farmers: 231, target: 210 },
  { month: "Aug", farmers: 268, target: 240 },
  { month: "Sep", farmers: 292, target: 270 },
  { month: "Oct", farmers: 177, target: 300 },
]

/** Money moving through AgroConnect and what it means for farmers (Phase 2 services). */
export const business = {
  paidToDealers: 48200,
  loansOut: 61800,
  repaymentPercent: 94,
  insuredFarmers: 140,
  coopPriceGain: 0.3,
  farmersPerOfficer: 171,
  activeLast30: 72,
  channels: [
    { name: "App", percent: 64 },
    { name: "USSD", percent: 22 },
    { name: "SMS", percent: 9 },
    { name: "Officer visit only", percent: 5 },
  ],
}
