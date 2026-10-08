import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import { fakeServer, json } from "@/test/fakes"
import { renderRoute } from "@/test/renderRoute"

beforeAll(async () => {
  await Promise.all([import("./AdminLayout"), import("./pages")])
}, 60_000)

beforeEach(() => {
  // admin pages are computer only (ADR 0024)
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
  fakeServer({}) // sample data: no network needed
})
afterEach(() => vi.unstubAllGlobals())

const admin = { as: "admin" as const }

describe("admin pages on sample data", () => {
  it("lists every admin place in the sidebar", async () => {
    renderRoute("/admin/regions", admin)
    for (const place of [
      "Overview",
      "Regions",
      "Agents",
      "Cooperatives",
      "Help desk",
      "Impact",
      "System",
    ])
      expect(
        await screen.findByRole("link", { name: place })
      ).toBeInTheDocument()
  })

  it("Regions shows totals by district and language", async () => {
    renderRoute("/admin/regions", admin)
    expect(
      await screen.findByRole("heading", {
        name: "Farmer registrations · Northern Region",
      })
    ).toBeInTheDocument()
    expect(screen.getByRole("meter", { name: "Tolon" })).toHaveAttribute(
      "aria-valuenow",
      "312"
    )
    expect(screen.getByText("App 70% · USSD 30%")).toBeInTheDocument()
    expect(
      screen.getAllByText("Coming in a later phase").length
    ).toBeGreaterThan(0)
  })

  it("Agents turns off a lost phone's access and invites a person", async () => {
    renderRoute("/admin/agents", admin)
    expect(await screen.findByText("Phone reported")).toBeInTheDocument()
    expect(
      screen.getByText(
        /Reported by phone call · Today 07:40 · 4 farmers not sent yet/
      )
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("button", { name: "Turn off Ibrahim's access" })
    )
    expect(screen.queryByText("Phone reported")).not.toBeInTheDocument()
    expect(screen.getAllByText("Access off").length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole("button", { name: "Add an agent" }))
    const panel = await screen.findByRole("dialog", { name: "Add a person" })
    await userEvent.click(
      within(panel).getByRole("button", { name: "Send invite" })
    )
    expect(within(panel).getAllByText("Fill this in.").length).toBeGreaterThan(
      0
    )
    // one name only, and a number someone already uses
    await userEvent.type(within(panel).getByLabelText("Full name"), "Amina")
    await userEvent.type(
      within(panel).getByLabelText("Phone number"),
      "024 000 0001"
    )
    expect(
      within(panel).getByText("Enter a first name and a surname, letters only.")
    ).toBeInTheDocument()
    expect(
      within(panel).getByText("Someone already signs in with this number.")
    ).toBeInTheDocument()
    await userEvent.type(within(panel).getByLabelText("Full name"), " Yakubu")
    await userEvent.clear(within(panel).getByLabelText("Phone number"))
    await userEvent.type(
      within(panel).getByLabelText("Phone number"),
      "024 555 0192"
    )
    await userEvent.click(
      within(panel).getByRole("radio", { name: "MoFA admin" })
    )
    expect(within(panel).queryByLabelText("District")).not.toBeInTheDocument()
    await userEvent.click(
      within(panel).getByRole("button", { name: "Send invite" })
    )
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Invite sent to Amina Yakubu by SMS"
    )
  })

  it("Help desk shows overdue questions first and reassigns one (HelpService)", async () => {
    const day = 24 * 60 * 60 * 1000
    const base = {
      farmerId: "f1",
      community: "Tolon",
      category: "crops",
      crop: null,
      problem: null,
      hasVoiceNote: false,
      voiceSeconds: null,
      officerId: "o1",
      officerName: "Kofi Asante",
      answer: null,
      answeredAt: null,
      remindedAt: null,
    }
    fakeServer({
      "GET /api/admin/help-desk": () =>
        json(200, {
          waiting: 2,
          overdue: 1,
          answered: 0,
          requests: [
            {
              ...base,
              id: "h1",
              farmerName: "Hawa Issah",
              text: "Possible fall armyworm",
              status: "waiting",
              overdue: true,
              createdAt: new Date(Date.now() - 2 * day).toISOString(),
            },
            {
              ...base,
              id: "h2",
              farmerName: "Salifu Iddrisu",
              text: "Yellow leaves",
              status: "waiting",
              overdue: false,
              createdAt: new Date().toISOString(),
            },
          ],
          officers: [
            {
              id: "o2",
              fullName: "Fuseini Alhassan",
              district: "Savelugu",
              open: 0,
            },
            { id: "o1", fullName: "Kofi Asante", district: "Tolon", open: 2 },
          ],
        }),
      "POST /api/admin/help-desk/h1/reassign": () =>
        json(200, {
          ...base,
          id: "h1",
          farmerName: "Hawa Issah",
          text: "Possible fall armyworm",
          status: "waiting",
          overdue: true,
          officerId: "o2",
          officerName: "Fuseini Alhassan",
          createdAt: new Date().toISOString(),
        }),
    })
    renderRoute("/admin/help-desk", admin)
    expect(
      await screen.findByRole("heading", {
        name: "Hawa Issah has waited 2 days",
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Kofi has 2 open questions. Fuseini \(Savelugu\) has 0/)
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Overdue 1" }))
    expect(
      screen.queryByRole("button", { name: /Salifu Iddrisu/ })
    ).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("button", { name: "Reassign to Fuseini" })
    )
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Given to Fuseini."
    )
  })

  it("Cooperatives shows orders and texts members who haven't pledged", async () => {
    renderRoute("/admin/cooperatives", admin)
    expect(await screen.findByText("Tarpaulins · 40")).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("button", { name: "SMS members who haven't pledged" })
    )
    expect(screen.getByRole("status")).toHaveTextContent("SMS sent")
  })

  it("Impact shows practices and the handover checklist", async () => {
    renderRoute("/admin/impact", admin)
    expect(
      await screen.findByRole("meter", { name: "Planting after first rains" })
    ).toHaveAttribute("aria-valuenow", "71")
    expect(
      screen.getByText("Each cooperative runs its own copy of the app")
    ).toBeInTheDocument()
    // not built yet: says so instead of doing nothing
    await userEvent.click(
      screen.getByRole("button", { name: "Download report (PDF)" })
    )
    expect(screen.getByRole("status")).toHaveTextContent(
      "Coming in a later phase."
    )
  })

  it("System shows each service and recent alerts", async () => {
    renderRoute("/admin/system", admin)
    expect(await screen.findByText("One service is slow")).toBeInTheDocument()
    expect(screen.getAllByText("Healthy")).toHaveLength(4)
    expect(
      screen.getByText("SMS delivery slower than usual")
    ).toBeInTheDocument()
  })

  it("Agents: the admin reports a phone for an agent who called in", async () => {
    renderRoute("/admin/agents", admin)
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Report a lost or stolen phone for Kofi Asante",
      })
    )
    const sheet = await screen.findByRole("dialog", {
      name: "Report Kofi Asante's phone",
    })
    await userEvent.click(within(sheet).getByRole("radio", { name: "Stolen" }))
    await userEvent.click(within(sheet).getByRole("radio", { name: "SMS" }))
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Report and turn off access" })
    )
    expect(screen.getByText("Kofi Asante: phone stolen")).toBeInTheDocument()
    expect(screen.getByText(/Reported by SMS · just now/)).toBeInTheDocument()
    expect(
      screen.queryByRole("button", {
        name: "Report a lost or stolen phone for Kofi Asante",
      })
    ).not.toBeInTheDocument()
  })
})
