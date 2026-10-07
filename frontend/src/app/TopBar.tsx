import type { ReactNode } from "react"
import { Link, NavLink } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { AccountMenu } from "./AccountMenu"
import type { NavItem } from "./navItems"

/**
 * The bar across the top of every page on computers (768 px and up, ADR 0030): the logo on the
 * left, then `children` (the officer's search) or the places as links (farmers, few places), and
 * on the right `actions` (the sync badge) and the account menu. Phones keep their bottom bar.
 */
export function TopBar({
  home,
  base,
  items,
  actions,
  children,
}: {
  home: string
  base: "" | "/farmer"
  /** Places shown as links in the bar (when there is no sidebar) */
  items?: readonly NavItem[]
  actions?: ReactNode
  children?: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center gap-6 border-b bg-card px-5 md:flex md:px-8">
      <Link
        to={home}
        className="shrink-0 text-2xl leading-9 font-semibold text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {t("app.name")}
      </Link>
      {items ? (
        <nav aria-label={t("nav.main")} className="flex-1">
          <ul className="flex items-center gap-1">
            {items.map(({ to, key, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      "flex h-10 items-center gap-2 rounded-full px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      isActive
                        ? "bg-secondary font-semibold text-primary"
                        : "font-medium text-muted-foreground hover:bg-muted"
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
      ) : (
        <div className="min-w-0 flex-1">{children}</div>
      )}
      <div className="flex shrink-0 items-center gap-3">
        {actions}
        <AccountMenu base={base} />
      </div>
    </header>
  )
}
