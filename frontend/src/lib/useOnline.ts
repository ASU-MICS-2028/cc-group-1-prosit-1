import { useSyncExternalStore } from "react"

function subscribe(notify: () => void) {
  window.addEventListener("online", notify)
  window.addEventListener("offline", notify)
  return () => {
    window.removeEventListener("online", notify)
    window.removeEventListener("offline", notify)
  }
}

/**
 * Whether the browser thinks it is online, kept up to date. React reads navigator.onLine again after it
 * starts listening, so a change between the first draw and the subscription is never missed.
 */
export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  )
}
