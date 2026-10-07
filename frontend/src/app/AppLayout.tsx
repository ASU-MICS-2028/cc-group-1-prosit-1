import { Suspense, useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { syncNow } from "@/features/sync/sync"
import { Loading } from "./Loading"
import { BottomNav, SideNav } from "./nav"
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

const SIDEBAR_KEY = "agroconnect.sidebar"

/** Whether the desktop sidebar is open; remembered on this device (Figma "Sidebar Tab"). */
function useSidebar() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) !== "closed"
    } catch {
      return true
    }
  })
  const toggle = () =>
    setOpen((was) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, was ? "closed" : "open")
      } catch {
        // Private mode or storage blocked: the choice just is not remembered.
      }
      return !was
    })
  return { open, toggle }
}

/**
 * The officer's frame, switched by width (team rule): under 768 px the phone design with the
 * floating bottom bar; from 768 px the Figma sidebar (logo, every place, sync card, Register a
 * farmer, open/close tab) next to the page. Each page keeps its own header and search.
 */
export function AppLayout() {
  const hideBottomNav = useHideBottomNav()
  const sidebar = useSidebar()
  useAutoSync()

  return (
    <div className="min-h-svh bg-background">
      <div className="md:flex">
        <SideNav open={sidebar.open} onToggle={sidebar.toggle} />
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
