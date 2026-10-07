import { Suspense, useEffect } from "react"
import { Outlet } from "react-router-dom"
import { FarmerSearch } from "@/components/FarmerSearch"
import { SyncBadge } from "@/components/SyncBadge"
import { countByStatus, useFarmers } from "@/features/farmers/farmers"
import { syncNow } from "@/features/sync/sync"
import { Loading } from "./Loading"
import { BottomNav, SideNav } from "./nav"
import { TopBar } from "./TopBar"
import { useHideBottomNav } from "./useHideBottomNav"

/** "We also sync on our own": when the app opens and whenever the network comes back. */
function useAutoSync() {
  useEffect(() => {
    // A failure is fine here: the queue stays and the Sync page shows what is waiting.
    const quietly = () => void syncNow().catch(() => {})
    quietly()
    window.addEventListener("online", quietly)
    return () => window.removeEventListener("online", quietly)
  }, [])
}

function OfficerSyncBadge() {
  const counts = countByStatus(useFarmers())
  return <SyncBadge waiting={counts.waiting} failed={counts.failed} />
}

/**
 * The officer's frame, switched by width (team rule): under 768 px the phone design with the
 * floating bottom bar; from 768 px a top bar (logo, search, sync badge, account menu) over the
 * sidebar with the work sections (ADR 0030).
 */
export function AppLayout() {
  const hideBottomNav = useHideBottomNav()
  useAutoSync()

  return (
    <div className="min-h-svh bg-background">
      <TopBar home="/" base="" actions={<OfficerSyncBadge />}>
        <FarmerSearch className="h-11 w-64 lg:w-80" />
      </TopBar>
      <div className="md:flex">
        <SideNav />
        <div className="min-w-0 flex-1">
          <main
            className={
              "mx-auto w-full max-w-6xl px-4 pt-4 md:px-8 md:pt-7 md:pb-10 " +
              (hideBottomNav ? "pb-8" : "pb-28")
            }
          >
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
      {hideBottomNav ? null : <BottomNav />}
    </div>
  )
}
