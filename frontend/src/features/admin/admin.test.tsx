import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import type { AdminOverview } from "@/api/admin"
import { fakeServer, json } from "@/test/fakes"
import { renderRoute, testAdmin } from "@/test/renderRoute"

/** A computer-sized screen: admin pages are computer only (ADR 0024). */
function onComputer() {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

// Pages are lazy chunks compiled on first use. Load them once here, with time to spare on a busy
// machine, so each test measures the screen and not the compiler.
beforeAll(async () => {
  await Promise.all([
    import("@/features/start/LoginPage"),
    import("@/features/start/CodePage"),
    import("./AdminLayout"),
    import("./AdminOverviewPage"),
  ])
}, 60_000)

afterEach(() => vi.unstubAllGlobals())

const overview: AdminOverview = {
  area: { region: "Northern", district: null },
  officers: 2,
  farmers: 37,
  farmersThisMonth: 5,
  visitsThisMonth: 12,
  officerList: [
    {
      id: "o1",
      fullName: "Abena Mensah",
      phoneE164: "+233240000002",
      district: "Tolon",
      farmers: 12,
      farmersThisMonth: 1,
      visitsThisMonth: 4,
      lastSyncAt: null,
    },
    {
      id: "o2",
      fullName: "Fuseini Alhassan",
      phoneE164: "+233240000001",
      district: "Savelugu",
      farmers: 25,
      farmersThisMonth: 4,
      visitsThisMonth: 8,
      lastSyncAt: "2026-10-06T09:02:00Z",
    },
  ],
}

describe("MoFA admin", () => {
  it("signs in on a computer with an SMS code and lands on the Overview", async () => {
    onComputer()
    const fetchMock = fakeServer({
      "POST /api/auth/code": () =>
        json(202, { resendAfterSeconds: 45, codeLifetimeSeconds: 600 }),
      "POST /api/auth/verify": () =>
        json(200, {
          token: "jwt",
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
          user: testAdmin,
        }),
      "/api/admin/overview": () => json(200, overview),
    })
    const { router } = renderRoute("/login/admin", { as: null })

    await userEvent.type(
      await screen.findByLabelText("Phone number"),
      "024 000 0009"
    )
    await userEvent.click(screen.getByRole("button", { name: "Send code" }))
    await userEvent.type(await screen.findByLabelText("6-digit code"), "123456")
    await userEvent.click(screen.getByRole("button", { name: "Verify" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/admin"))
    const sent = fetchMock.mock.calls.map(([, init]) =>
      init?.body ? JSON.parse(String(init.body)).role : null
    )
    expect(sent.slice(0, 2)).toEqual(["admin", "admin"])
    expect(
      await screen.findByRole("heading", { name: "Overview" })
    ).toBeInTheDocument()
  })

  it("shows the area, its totals and every officer with their last sync", async () => {
    onComputer()
    fakeServer({ "/api/admin/overview": () => json(200, overview) })
    renderRoute("/admin", { as: "admin" })

    expect(await screen.findByText("Northern Region")).toBeInTheDocument()
    expect(screen.getByText("37")).toBeInTheDocument()
    expect(screen.getByText("Farmers registered")).toBeInTheDocument()
    const table = screen.getByRole("table")
    const abena = within(table).getByRole("row", { name: /Abena Mensah/ })
    expect(abena).toHaveTextContent("Tolon")
    expect(abena).toHaveTextContent("Not yet")
    expect(
      within(table).getByRole("row", { name: /Fuseini Alhassan/ })
    ).toHaveTextContent(/6 Oct \d\d:\d\d/)
    // The admin sidebar: who is signed in, their area, and only built places
    expect(screen.getByText("MoFA, Northern Region")).toBeInTheDocument()
    expect(
      within(screen.getByRole("navigation", { name: "Main" })).getAllByRole(
        "link"
      )
    ).toHaveLength(1)
  })

  it("on a phone, says admin works on a computer", async () => {
    fakeServer({})
    renderRoute("/admin", { as: "admin" })

    expect(
      await screen.findByRole("heading", { name: "Admin works on a computer" })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument()
  })

  it("keeps admins and officers in their own areas", async () => {
    onComputer()
    fakeServer({ "/api/admin/overview": () => json(200, overview) })
    const admin = renderRoute("/", { as: "admin" })
    await waitFor(() =>
      expect(admin.router.state.location.pathname).toBe("/admin")
    )
    admin.unmount()

    fakeServer({})
    const officer = renderRoute("/admin", { as: "officer" })
    await waitFor(() =>
      expect(officer.router.state.location.pathname).toBe("/")
    )
  })
})
