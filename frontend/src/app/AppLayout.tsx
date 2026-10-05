import { Suspense } from "react"
import { Outlet } from "react-router-dom"
import { Loading } from "./Loading"
import { BottomNav, SideNav } from "./nav"

/**
 * One layout for every size: a floating bottom bar on phones, a sidebar from
 * tablet width up, and a content column that never gets too wide to read.
 */
export function AppLayout() {
  return (
    <div className="min-h-svh md:flex">
      <SideNav />
      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 md:px-8 md:pt-10 md:pb-10">
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
