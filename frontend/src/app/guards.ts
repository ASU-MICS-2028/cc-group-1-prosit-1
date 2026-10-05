import { redirect } from "react-router-dom"
import { getSession, homeFor, type Role } from "@/auth/session"
import { hasChosenLanguage } from "@/i18n"

/** Where someone who is not signed in starts: the welcome screen the first time, else "Who are you?". */
function startPage() {
  return hasChosenLanguage() ? "/who" : "/welcome"
}

/** Route loader for the signed-in parts: the right role, or back to the start. */
export function requireRole(role: Role) {
  return () => {
    const session = getSession()
    if (!session) throw redirect(startPage())
    if (session.user.role !== role) throw redirect(homeFor(session.user.role))
    return null
  }
}

/** Route loader for the start and log-in screens: someone already signed in goes to their home. */
export function signedOutOnly() {
  const session = getSession()
  if (session) throw redirect(homeFor(session.user.role))
  return null
}
