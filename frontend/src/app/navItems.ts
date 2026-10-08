import {
  CalendarCheck,
  CircleHelp,
  CircleUser,
  House,
  MessageSquareText,
  Store,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  to: string
  key: `nav.${"home" | "farmers" | "visits" | "requests" | "market" | "money" | "profile" | "help" | "overview"}`
  icon: LucideIcon
  end: boolean
}

const home: NavItem = { to: "/", key: "nav.home", icon: House, end: true }
const farmers: NavItem = {
  to: "/farmers",
  key: "nav.farmers",
  icon: Users,
  end: false,
}
const visits: NavItem = {
  to: "/visits",
  key: "nav.visits",
  icon: CalendarCheck,
  end: false,
}
const requests: NavItem = {
  to: "/requests",
  key: "nav.requests",
  icon: MessageSquareText,
  end: false,
}
const market: NavItem = {
  to: "/market",
  key: "nav.market",
  icon: Store,
  end: false,
}
const money: NavItem = {
  to: "/money",
  key: "nav.money",
  icon: Wallet,
  end: false,
}
const profile: NavItem = {
  to: "/profile",
  key: "nav.profile",
  icon: CircleUser,
  end: false,
}

/**
 * The officer's phone bar (Figma "Phone Nav · Extension Officer"): five tabs. Requests and Money
 * open from cards on Home, because a phone bar has room for five.
 */
export const navItems: readonly NavItem[] = [
  home,
  farmers,
  visits,
  market,
  profile,
]

/**
 * The officer's sidebar on computers (Figma "Desktop Sidebar · Office"): every place, so the
 * officer can do on a computer everything they can do on a phone.
 */
export const sideNavItems: readonly NavItem[] = [
  home,
  farmers,
  visits,
  requests,
  market,
  money,
  profile,
]

/** The farmer's places (Figma "Phone Nav · Farmer"). Farmers are phone only (ADR 0024). */
export const farmerNavItems: readonly NavItem[] = [
  { to: "/farmer", key: "nav.home", icon: House, end: true },
  { to: "/farmer/prices", key: "nav.market", icon: Store, end: false },
  { to: "/farmer/money", key: "nav.money", icon: Wallet, end: false },
  { to: "/farmer/help", key: "nav.help", icon: CircleHelp, end: false },
  { to: "/farmer/profile", key: "nav.profile", icon: CircleUser, end: false },
]
