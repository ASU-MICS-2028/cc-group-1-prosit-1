import { Clock } from "lucide-react"
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
 * Computers and tablets (768 px and up): the officer's work sections down the left (Figma D04),
 * under the top bar that holds the logo and the account menu (ADR 0030). `footer` holds what sits
 * at the bottom (the officer's sync card and Register button).
 */
export function SideNav({
  items = sideNavItems,
  footer = <OfficerSideFooter />,
}: {
  items?: readonly NavItem[]
  footer?: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <aside className="sticky top-16 hidden h-[calc(100svh-4rem)] w-62 shrink-0 flex-col gap-10 border-r bg-card px-5 pt-6 pb-6 md:flex">
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
    </aside>
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
      ) : null}
      <Link
        to="/register"
        className={cn(buttonVariants({ size: "xl" }), "w-full")}
      >
        {t("home.register")}
      </Link>
    </>
  )
}
