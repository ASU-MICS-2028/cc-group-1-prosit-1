import { NavLink } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { LanguagePicker } from "@/components/LanguagePicker"
import { cn } from "@/lib/utils"
import { navItems } from "./navItems"

/** Phones: the floating pill at the bottom, like the design. */
export function BottomNav() {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t("nav.main")}
      className="fixed inset-x-4 bottom-3 z-20 mx-auto max-w-md rounded-full bg-background/95 px-2 py-1.5 shadow-floating ring-1 ring-border backdrop-blur md:hidden"
    >
      <ul className="flex">
        {navItems.map(({ to, key, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <Icon aria-hidden className="size-5" />
              {t(key)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Tablets and computers: the same four places as a sidebar. */
export function SideNav() {
  const { t } = useTranslation()

  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-8 border-r bg-sidebar p-5 md:flex">
      <span className="text-2xl font-bold tracking-tight text-primary">
        {t("app.name")}
      </span>
      <nav aria-label={t("nav.main")}>
        <ul className="space-y-1">
          {navItems.map(({ to, key, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex h-11 items-center gap-3 rounded-full px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    isActive
                      ? "bg-secondary font-semibold text-secondary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )
                }
              >
                <Icon aria-hidden className="size-5" />
                {t(key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto space-y-1.5">
        <label
          htmlFor="sidebar-language"
          className="block text-xs font-medium text-muted-foreground"
        >
          {t("common.language")}
        </label>
        <LanguagePicker id="sidebar-language" />
      </div>
    </aside>
  )
}
