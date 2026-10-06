import { useSyncExternalStore } from "react"
import type { components } from "@/api/schema"

export type User = components["schemas"]["MeResponse"]
export type Role = components["schemas"]["UserRole"]

/** Who is signed in on this phone. Kept on the phone so the app works offline for the token's 7 days (ADR 0022). */
export interface Session {
  token: string
  /** ISO time the token stops working */
  expiresAt: string
  user: User
}

const STORAGE_KEY = "agroconnect.session"
const listeners = new Set<() => void>()
let cached: { raw: string | null; session: Session | null } | undefined

function parse(raw: string | null): Session | null {
  try {
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

function read(): Session | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return cached?.session ?? null // storage blocked: only this page knows
  }
  // Same text, same object: React needs a stable value between renders.
  if (cached && cached.raw === raw) return cached.session
  cached = { raw, session: parse(raw) }
  return cached.session
}

/** The signed-in person, or null when nobody is or the token has expired. */
export function getSession(): Session | null {
  const session = read()
  if (!session) return null
  return Date.parse(session.expiresAt) > Date.now() ? session : null
}

export function saveSession(session: Session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // storage blocked: the person stays signed in until the page closes
    cached = { raw: JSON.stringify(session), session }
  }
  listeners.forEach((notify) => notify())
}

/** Log out: removes the token from this phone. Saved farmers stay until they are synced. */
export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // nothing to remove
  }
  cached = undefined
  listeners.forEach((notify) => notify())
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => listeners.delete(notify)
}

export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSession, () => null)
}

/** Where a signed-in person starts. */
export function homeFor(role: Role): string {
  return role === "farmer" ? "/farmer" : "/"
}
