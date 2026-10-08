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
    district: "Savelugu",
    farmers: 312,
    lastSync: "Today 08:14",
    role: "officer",
    access: "active",
  },
  {
    id: "a2",
    name: "Kofi Asante",
    district: "Tolon",
    farmers: 286,
    lastSync: "Yesterday",
    role: "officer",
    access: "active",
  },
  {
    id: "a3",
    name: "Abena Darko",
    district: "Kumbungu",
    farmers: 241,
    lastSync: "3 days ago",
    role: "officer",
    access: "checkIn",
  },
  {
    id: "a4",
    name: "Ibrahim Musah",
    district: "Tamale Metro",
    farmers: 198,
    lastSync: "12 days ago",
    role: "officer",
    access: "phoneLost",
  },
  {
    id: "a5",
    name: "Esi Owusu",
    district: "Region office",
    farmers: null,
    lastSync: "Today 09:02",
    role: "admin",
    access: "active",
  },
]
export const agentTotal = 61

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

export type HelpStatus = "waiting" | "overdue" | "answered"

export interface HelpRequest {
  id: string
  farmer: string
  title: string
  officer: string | null
  waited: string
  status: HelpStatus
  via: "call" | "message" | "ussd"
  place: string
  sent: string
  voiceNote?: string
  suggestion?: { text: string; reassignTo: string }
}

/** P4 · D4 Help Desk: questions that waited too long with the farmer's own officer */
export const helpRequests: readonly HelpRequest[] = [
  {
    id: "h1",
    farmer: "Hawa Issah",
    title: "possible fall armyworm",
    officer: "Kofi",
    waited: "2 days",
    status: "overdue",
    via: "call",
    place: "Tolon",
    sent: "crop photo and voice note",
    voiceNote: "0:18",
    suggestion: {
      text: "Kofi has 6 open requests this week. Fuseini (Savelugu, 4 km away) has 2. Remind Kofi, or give this request to Fuseini.",
      reassignTo: "Fuseini",
    },
  },
  {
    id: "h2",
    farmer: "Salifu Iddrisu",
    title: "yellow leaves on maize",
    officer: "Fuseini",
    waited: "2 hours",
    status: "waiting",
    via: "message",
    place: "Kumbungu",
    sent: "text message",
  },
  {
    id: "h3",
    farmer: "Abiba Seidu",
    title: "help with seed loan",
    officer: "Fuseini",
    waited: "yesterday",
    status: "answered",
    via: "ussd",
    place: "Kumbungu",
    sent: "USSD",
  },
  {
    id: "h4",
    farmer: "2 farmers in Yendi",
    title: "no officer",
    officer: null,
    waited: "1 day",
    status: "overdue",
    via: "call",
    place: "Yendi",
    sent: "phone calls",
    suggestion: {
      text: "Their officer left. Fuseini covers the nearest district and has 2 open requests.",
      reassignTo: "Fuseini",
    },
  },
]
export const helpCounts = { waiting: 14, overdue: 3, answered: 128 }

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
