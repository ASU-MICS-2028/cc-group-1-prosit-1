import { Suspense } from "react"
import { Outlet } from "react-router-dom"
import { useHideBottomNav } from "@/app/useHideBottomNav"
import { Loading } from "@/app/Loading"
import { BottomNav } from "@/app/nav"
import { farmerNavItems, farmerTopItems } from "@/app/navItems"
import { TopBar } from "@/app/TopBar"
import { cn } from "@/lib/utils"

/**
 * The farmer's app, switched by width like the officer's (ADR 0024 amendment): the phone design with
 * the bottom bar under 768 px. From 768 px a top bar with Home and Help as links and the account menu
 * on the right (ADR 0030); with so few places there is no sidebar.
 */
export function Component() {
  const hide = useHideBottomNav()

  return (
    <div className="min-h-svh bg-background">
      <TopBar home="/farmer" base="/farmer" items={farmerTopItems} />
      <main
        className={cn(
          "mx-auto w-full max-w-6xl px-4 pt-4 md:px-8 md:pt-7 md:pb-10",
          hide ? "pb-8" : "pb-28"
        )}
      >
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      {hide ? null : <BottomNav items={farmerNavItems} />}
    </div>
  )
}
