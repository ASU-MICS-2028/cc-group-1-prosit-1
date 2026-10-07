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
 * False when the phone says it has no network (airplane mode, no signal). True can still mean
 * a connection too weak to reach the server, so a failed request is handled on its own.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  )
}
