import { CircleUser, House, RefreshCw, Users } from "lucide-react"

export const navItems = [
  { to: "/", key: "nav.home", icon: House, end: true },
  { to: "/farmers", key: "nav.farmers", icon: Users, end: false },
  { to: "/sync", key: "nav.sync", icon: RefreshCw, end: false },
  { to: "/profile", key: "nav.profile", icon: CircleUser, end: false },
] as const
