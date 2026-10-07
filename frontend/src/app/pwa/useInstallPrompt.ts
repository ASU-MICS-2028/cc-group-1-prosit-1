import { useState, useSyncExternalStore } from "react"

/** Chrome and Edge's "this app can be installed" event (not yet in TypeScript's DOM types). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISSED_KEY = "agroconnect.installDismissedAt"
/** After "Not now", ask again two weeks later. */
const ASK_AGAIN_MS = 14 * 24 * 60 * 60 * 1000

// The browser announces "installable" once per page load, possibly before any screen is drawn,
// so the event is kept here, outside React, and every screen reads the same value.
let saved: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault() // stop Chrome's own mini bar; we ask at a better moment
    saved = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener("appinstalled", () => {
    saved = null
    notify()
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function recentlyDismissed(): boolean {
  try {
    const at = Date.parse(localStorage.getItem(DISMISSED_KEY) ?? "")
    return Date.now() - at < ASK_AGAIN_MS
  } catch {
    return false
  }
}

/** True when AgroConnect is already running as the installed app. */
export function isInstalled(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches
  )
}

/**
 * Our own "Install AgroConnect" (Figma 22). The browser decides the app can be installed (HTTPS or
 * localhost, a manifest, a service worker) and fires `beforeinstallprompt`; we show its install
 * question when the person taps Install. Safari never fires it: iPhones use Share → Add to Home Screen.
 */
export function useInstallPrompt() {
  const event = useSyncExternalStore(
    subscribe,
    () => saved,
    () => null
  )
  const [dismissed, setDismissed] = useState(recentlyDismissed)

  async function install(): Promise<boolean> {
    if (!saved) return false
    const current = saved
    await current.prompt()
    const { outcome } = await current.userChoice
    saved = null // the event can only be used once
    notify()
    return outcome === "accepted"
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, new Date().toISOString())
    } catch {
      // storage blocked: just hide it for now
    }
    setDismissed(true)
  }

  return {
    /** The browser offers installing right now */
    available: event !== null,
    /** ...and the person has not said "Not now" lately (for the pop-up card) */
    canInstall: event !== null && !dismissed,
    install,
    dismiss,
  }
}
