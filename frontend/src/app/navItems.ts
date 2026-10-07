import {
  CalendarCheck,
  CircleHelp,
  CircleUser,
  House,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  to: string
  key: `nav.${"home" | "farmers" | "visits" | "profile" | "help" | "market"}`
  icon: LucideIcon
  end: boolean
}

/**
 * The officer's four places (Figma "Phone Nav · Extension Officer", D04 sidebar). Market and Money
 * join in Phase 2 with their screens; Sync is reached from the waiting badge and Profile.
 */
export const navItems: readonly NavItem[] = [
  { to: "/", key: "nav.home", icon: House, end: true },
  { to: "/farmers", key: "nav.farmers", icon: Users, end: false },
  { to: "/visits", key: "nav.visits", icon: CalendarCheck, end: false },
  { to: "/profile", key: "nav.profile", icon: CircleUser, end: false },
]

/** Computers: the work sections in the sidebar; Profile moves to the account menu (ADR 0030). */
export const sideNavItems: readonly NavItem[] = navItems.filter(
  (item) => item.key !== "nav.profile"
)

/** The farmer's places (Figma "Phone Nav · Farmer"); Money joins with the mobile money service (Phase 3). */
export const farmerNavItems: readonly NavItem[] = [
  { to: "/farmer", key: "nav.home", icon: House, end: true },
  { to: "/farmer/prices", key: "nav.market", icon: Store, end: false },
  { to: "/farmer/help", key: "nav.help", icon: CircleHelp, end: false },
  { to: "/farmer/profile", key: "nav.profile", icon: CircleUser, end: false },
]

/** Computers: the farmer's places as links in the top bar; Profile is in the account menu. */
export const farmerTopItems: readonly NavItem[] = farmerNavItems.filter(
  (item) => item.key !== "nav.profile"
)
