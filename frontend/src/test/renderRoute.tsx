import { render } from "@testing-library/react"
import { RouterProvider, createMemoryRouter } from "react-router-dom"
import { routes } from "@/app/router"
import type { Role, Session } from "@/auth/session"
import "@/i18n"

export const testOfficer: Session["user"] = {
  id: "01a10ac0-450d-7b2c-95b4-c432dab17144",
  role: "officer",
  fullName: "Fuseini Alhassan",
  phone: "+233240000001",
  region: "Northern",
  district: "Savelugu",
  farmerId: null,
}

export const testFarmer: Session["user"] = {
  id: "01a10ac0-450d-7b2c-95b4-c432dab17145",
  role: "farmer",
  fullName: "Ama Boateng",
  phone: "+233240001234",
  region: "Northern · Tolon District",
  district: null,
  farmerId: "0192f0a0-0000-7000-8000-000000000001",
}

export const testAdmin: Session["user"] = {
  id: "01a10ac0-450d-7b2c-95b4-c432dab17146",
  role: "admin",
  fullName: "Esi Owusu",
  phone: "+233240000009",
  region: "Northern",
  district: null,
  farmerId: null,
}

/** Puts a signed-in session on the "phone" (localStorage), valid for a week. */
export function signIn(role: Role = "officer") {
  const session: Session = {
    token: "test-token",
    expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    user:
      role === "farmer"
        ? testFarmer
        : role === "admin"
          ? testAdmin
          : testOfficer,
  }
  localStorage.setItem("agroconnect.session", JSON.stringify(session))
}

/**
 * Renders the app at a path. By default the language is chosen and an officer is signed in.
 * `firstRun: true` = brand new phone (no language, nobody signed in);
 * `as: null` = language chosen but nobody signed in.
 */
export function renderRoute(
  path: string,
  {
    firstRun = false,
    as = "officer" as Role | null,
    state,
  }: {
    firstRun?: boolean
    as?: Role | null
    state?: unknown
  } = {}
) {
  if (!firstRun) {
    localStorage.setItem("agroconnect.lang", "en")
    if (as) signIn(as)
  }
  const router = createMemoryRouter(routes, {
    initialEntries: [state === undefined ? path : { pathname: path, state }],
  })
  return { router, ...render(<RouterProvider router={router} />) }
}
