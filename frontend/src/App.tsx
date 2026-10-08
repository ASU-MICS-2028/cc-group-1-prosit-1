import { useSyncExternalStore } from "react"
import { RouterProvider } from "react-router-dom"
import { router } from "@/app/router"
import { AppPrompts } from "@/app/pwa/AppPrompts"
import { SpeechOverlay } from "@/components/SpeechOverlay"

const subscribe = (notify: () => void) => router.subscribe(notify)
const currentPath = () => router.state.location.pathname

export default function App() {
  // The prompts sit outside the router, so they follow the address through the router's own updates.
  const pathname = useSyncExternalStore(subscribe, currentPath)

  return (
    <>
      <RouterProvider router={router} />
      <AppPrompts pathname={pathname} />
      <SpeechOverlay />
    </>
  )
}
