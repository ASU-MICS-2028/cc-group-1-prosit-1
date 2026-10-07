import { Check, ChevronLeft, ChevronRight, Clock } from "lucide-react"
import type { ReactNode } from "react"
import { Link, NavLink } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { buttonVariants } from "@/components/ui/button"
import { countByStatus, useFarmers } from "@/features/farmers/farmers"
import { cn } from "@/lib/utils"
import { navItems, sideNavItems, type NavItem } from "./navItems"

/** Phones: the floating white bar at the bottom (Figma "Phone Nav"). */
export function BottomNav({
  items = navItems,
}: {
  items?: readonly NavItem[]
}) {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t("nav.main")}
      className="fixed inset-x-4 bottom-3 z-20 mx-auto max-w-md rounded-[28px] bg-card px-2 py-2 shadow-floating ring-1 ring-border md:hidden"
    >
      <ul className="flex">
        {items.map(({ to, key, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  isActive
                    ? "font-semibold text-primary"
                    : "font-medium text-muted-foreground"
                )
              }
            >
              <Icon aria-hidden className="size-6" />
              {t(key)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * Computers and tablets (768 px and up): the officer's sidebar (Figma "Desktop Sidebar · Office"):
 * the logo, every place, then the sync card and Register a farmer at the bottom. The small tab on
 * its right edge closes it; when closed only the tab stays, at the left edge of the window.
 */
export function SideNav({
  items = sideNavItems,
  footer = <OfficerSideFooter />,
  open,
  onToggle,
}: {
  items?: readonly NavItem[]
  footer?: ReactNode
  open: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()

  if (!open) {
    return (
      <div className="sticky top-0 hidden h-svh w-0 md:block">
        <SidebarTab open={false} onToggle={onToggle} />
      </div>
    )
  }
  return (
    <aside className="sticky top-0 hidden h-svh w-62 shrink-0 flex-col gap-8 border-r bg-card px-5 pt-7 pb-6 md:flex">
      <Link
        to="/"
        className="px-1 text-2xl leading-9 font-semibold text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {t("app.name")}
      </Link>
      <nav aria-label={t("nav.main")}>
        <ul className="space-y-2">
          {items.map(({ to, key, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex h-12 items-center gap-3 rounded-full px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    isActive
                      ? "bg-secondary font-semibold text-primary"
                      : "font-medium text-muted-foreground hover:bg-muted"
                  )
                }
              >
                <Icon aria-hidden className="size-5.5" />
                {t(key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {footer ? <div className="mt-auto space-y-3">{footer}</div> : null}
      <SidebarTab open onToggle={onToggle} />
    </aside>
  )
}

/** The small rectangle on the sidebar's edge (Figma "Sidebar Tab"): ‹ closes, › opens. */
function SidebarTab({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const Chevron = open ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={t(open ? "nav.collapse" : "nav.expand")}
      aria-expanded={open}
      className={cn(
        "absolute top-1/2 z-30 flex h-14 w-5 -translate-y-1/2 items-center justify-center rounded-r-[10px] border border-l-0 bg-card text-muted-foreground shadow-sm outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50",
        open ? "-right-5" : "left-0"
      )}
    >
      <Chevron aria-hidden className="size-4" />
    </button>
  )
}

/** The officer's sidebar bottom: "N not sent yet / Open Sync" and Register a farmer. */
function OfficerSideFooter() {
  const { t } = useTranslation()
  const counts = countByStatus(useFarmers())

  return (
    <>
      {counts.waiting > 0 ? (
        <div className="space-y-1 rounded-[20px] bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
          <p className="flex items-center gap-2">
            <Clock aria-hidden className="size-4.5" />
            {t("sync.notSentYet", { count: counts.waiting })}
          </p>
          <Link
            to="/sync"
            className="block text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {t("sync.open")}
          </Link>
        </div>
      ) : (
        <Link
          to="/sync"
          className="flex items-center gap-2 rounded-[20px] bg-secondary px-4 py-3 text-sm font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Check aria-hidden className="size-4.5" />
          {t("sync.allSent")}
        </Link>
      )}
      <Link
        to="/register"
        className={cn(buttonVariants({ size: "xl" }), "w-full")}
      >
        {t("home.register")}
      </Link>
    </>
  )
}
