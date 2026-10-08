import {
  CircleHelp,
  LayoutDashboard,
  Leaf,
  LogOut,
  Map,
  Server,
  UserPlus,
  Users,
} from "lucide-react"
import { Suspense, useState } from "react"
import { Outlet } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useSession } from "@/auth/session"
import { Loading } from "@/app/Loading"
import { SideNav } from "@/app/nav"
import type { NavItem } from "@/app/navItems"
import { useSidebar } from "@/app/useSidebar"
import { ScreenShell } from "@/components/ScreenShell"
import { Button } from "@/components/ui/button"
import { LogoutSheet } from "@/features/account/LogoutSheet"
import { Avatar } from "@/features/farmers/FarmerRow"
import { useIsDesktop } from "@/lib/useIsDesktop"
import { useAdminArea } from "./area"

/**
 * The admin menu (Figma "Sidebar Nav (Phase 4, MoFA admin)"): Overview, Regions, Agents, Cooperatives,
 * Help desk, Impact, System. Overview is live; the others run on sample data (features/admin/sample.ts)
 * until AdminService has their endpoints.
 */
const adminNavItems: readonly NavItem[] = [
  { to: "/admin", key: "nav.overview", icon: LayoutDashboard, end: true },
  { to: "/admin/regions", key: "nav.regions", icon: Map, end: false },
  { to: "/admin/agents", key: "nav.agents", icon: UserPlus, end: false },
  {
    to: "/admin/cooperatives",
    key: "nav.cooperatives",
    icon: Users,
    end: false,
  },
  { to: "/admin/help-desk", key: "nav.helpDesk", icon: CircleHelp, end: false },
  { to: "/admin/impact", key: "nav.impact", icon: Leaf, end: false },
  { to: "/admin/system", key: "nav.system", icon: Server, end: false },
]

/** The bottom of the admin sidebar (Figma): who is signed in and their area, and Log out. */
function AdminSideFooter() {
  const { t } = useTranslation()
  const name = useSession()?.user.fullName ?? ""
  const area = useAdminArea()
  const [leaving, setLeaving] = useState(false)

  return (
    <>
      <div className="flex items-center gap-3 rounded-[20px] bg-cream p-3">
        <Avatar name={name} size="sm" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">
            {name}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {area}
          </span>
        </span>
      </div>
      <Button
        variant="ghost"
        className="w-full justify-start gap-3 text-muted-foreground"
        onClick={() => setLeaving(true)}
      >
        <LogOut aria-hidden className="size-5" />
        {t("common.logOut")}
      </Button>
      <LogoutSheet
        open={leaving}
        onClose={() => setLeaving(false)}
        waiting={0}
      />
    </>
  )
}

/**
 * The MoFA admin's frame (ADR 0024): the Figma admin sidebar next to the page. Admin is computer only,
 * so under 768 px it shows "Admin works on a computer" with Log out.
 */
export function Component() {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  const sidebar = useSidebar()
  const [leaving, setLeaving] = useState(false)

  if (!desktop) {
    return (
      <ScreenShell
        footer={
          <Button size="xl" className="w-full" onClick={() => setLeaving(true)}>
            {t("common.logOut")}
          </Button>
        }
      >
        <div className="space-y-2">
          <h1 className="text-2xl leading-9 font-medium text-foreground">
            {t("login.adminPhoneTitle")}
          </h1>
          <p className="text-base text-muted-foreground">
            {t("login.adminPhoneText")}
          </p>
        </div>
        <LogoutSheet
          open={leaving}
          onClose={() => setLeaving(false)}
          waiting={0}
        />
      </ScreenShell>
    )
  }

  return (
    <div className="min-h-svh bg-background md:flex">
      <SideNav
        items={adminNavItems}
        homeTo="/admin"
        subtitle={t("admin.role")}
        footer={<AdminSideFooter />}
        open={sidebar.open}
        onToggle={sidebar.toggle}
      />
      <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-8 pt-7 pb-10">
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
