import { Suspense } from "react"
import { NavLink, Outlet } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Loading } from "./Loading"
import { LanguagePicker } from "@/components/LanguagePicker"
import { cn } from "@/lib/utils"

const links = [
  { to: "/", key: "nav.home", end: true },
  { to: "/register", key: "nav.register" },
  { to: "/farmers", key: "nav.farmers" },
  { to: "/settings", key: "nav.settings" },
] as const

export function AppLayout() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <span className="text-lg font-semibold">{t("app.name")}</span>
          <LanguagePicker />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>

      <nav aria-label="Main" className="sticky bottom-0 border-t bg-background">
        <ul className="mx-auto flex max-w-3xl">
          {links.map((link) => (
            <li key={link.to} className="flex-1">
              <NavLink
                to={link.to}
                end={"end" in link}
                className={({ isActive }) =>
                  cn(
                    "block px-2 py-3 text-center text-sm font-medium",
                    isActive
                      ? "text-primary underline underline-offset-4"
                      : "text-muted-foreground"
                  )
                }
              >
                {t(link.key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
