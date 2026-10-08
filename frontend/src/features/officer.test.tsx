import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { db } from "@/db/local"
import { fakeServer, json, seedFarmer } from "@/test/fakes"
import { renderRoute } from "@/test/renderRoute"

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, "onLine")
})

/** The test "phone" loses or gets its network. */
function setOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", {
    value: online,
    configurable: true,
  })
  act(() => {
    window.dispatchEvent(new Event(online ? "online" : "offline"))
  })
}

describe("officer home", () => {
  it("shows today's numbers, recent farmers and the sync badge", async () => {
    await seedFarmer({ fullName: "Ama Boateng" })
    await seedFarmer({
      fullName: "Issah Abdulai",
      syncStatus: "synced",
      createdAt: "2026-10-01T09:00:00Z",
    })
    await seedFarmer({
      fullName: "Mariama Alhassan",
      syncStatus: "failed",
      syncProblem: "Phone number is too short",
    })
    renderRoute("/")

    expect(await screen.findAllByText("Issah Abdulai")).not.toHaveLength(0)
    const today = screen.getAllByRole("region", { name: "Today" })[0]
    expect(
      within(today).getByRole("link", { name: /2\s*Registered/ })
    ).toHaveAttribute("href", "/farmers")
    expect(
      within(today).getByRole("link", { name: /1\s*Waiting/ })
    ).toHaveAttribute("href", "/sync")
    expect(
      within(today).getByRole("link", { name: /1\s*To fix/ })
    ).toHaveAttribute("href", "/farmers?status=failed")
    expect(
      screen.getAllByRole("link", { name: "1 waiting" })[0]
    ).toHaveAttribute("href", "/sync")
    // the second line says why a farmer needs fixing, or that it was added today
    expect(
      screen.getAllByText("Phone number is too short").length
    ).toBeGreaterThan(0)
    expect(screen.getAllByText("Tolon · added today").length).toBeGreaterThan(0)
  })

  it("says when there is no network, and that work can go on", async () => {
    renderRoute("/")
    await screen.findByRole("heading", { name: "Fuseini" })
    setOnline(false)
    expect(
      await screen.findByText(/No network. You can keep registering/)
    ).toBeInTheDocument()
    setOnline(true)
    await waitFor(() =>
      expect(screen.queryByText(/No network/)).not.toBeInTheDocument()
    )
  })

  it("search opens the farmer list with the words typed", async () => {
    const { router } = renderRoute("/")
    const [box] = await screen.findAllByRole("searchbox", {
      name: "Search farmers",
    })
    await userEvent.type(box, "ama{Enter}")
    await waitFor(() => expect(router.state.location.pathname).toBe("/farmers"))
    expect(router.state.location.search).toBe("?q=ama")
  })
})

describe("farmer page", () => {
  it("shows the answers, consent and the sync state, and reads them aloud", async () => {
    const speakMock = vi.fn()
    vi.stubGlobal("speechSynthesis", { cancel: vi.fn(), speak: speakMock })
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        text: string
        lang = ""
        rate = 1
        constructor(t: string) {
          this.text = t
        }
      }
    )
    const farmer = await seedFarmer({
      fullName: "Ama Boateng",
      consentAt: "2026-10-06T09:00:00Z",
    })
    renderRoute(`/farmers/${farmer.id}`)

    expect(
      await screen.findByRole("heading", { name: "Ama Boateng" })
    ).toBeInTheDocument()
    // the farm card is drawn twice: second on phones, on the right on computers
    expect(screen.getAllByText("Maize, Groundnut")).toHaveLength(2)
    expect(screen.getAllByText("2.5 acres, loamy")[0]).toBeInTheDocument()
    expect(screen.getByText("+233 24 000 1234")).toBeInTheDocument()
    expect(
      screen.getByText("6 October 2026, in English, recorded by Fuseini")
    ).toBeInTheDocument()
    expect(screen.getAllByText("Waiting to sync").length).toBeGreaterThan(0)
    expect(
      screen.getAllByRole("link", { name: "Edit The farm" })[0]
    ).toHaveAttribute("href", `/farmers/${farmer.id}/edit/farm`)

    await userEvent.click(
      screen.getByRole("button", { name: "Listen to this profile" })
    )
    expect(speakMock).toHaveBeenCalled()
    expect((speakMock.mock.calls[0][0] as { text: string }).text).toMatch(
      /^Ama Boateng\. Tolon, Northern/
    )
  })

  it("edits a section, puts the farmer back in the queue, and returns", async () => {
    const farmer = await seedFarmer({ syncStatus: "synced" })
    const { router } = renderRoute(`/farmers/${farmer.id}/edit/farm`)

    expect(
      await screen.findByRole("heading", { name: "Edit: The farm" })
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole("checkbox", { name: "Rice" }))
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/farmers/${farmer.id}`)
    )
    const saved = await db.farmers.get(farmer.id)
    expect(saved).toMatchObject({
      crops: ["maize", "groundnut", "rice"],
      syncStatus: "waiting",
    })
    expect(saved!.clientUpdatedAt > farmer.clientUpdatedAt).toBe(true)
    expect(await db.outbox.where("recordId").equals(farmer.id).count()).toBe(1)
  })

  it("Cancel leaves the farmer unchanged", async () => {
    const farmer = await seedFarmer()
    const { router } = renderRoute(`/farmers/${farmer.id}/edit/personal`)
    const name = await screen.findByRole("textbox", { name: "Full name" })
    await userEvent.clear(name)
    await userEvent.type(name, "Someone Else")
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/farmers/${farmer.id}`)
    )
    expect((await db.farmers.get(farmer.id))!.fullName).toBe("Ama Boateng")
  })
})

describe("sync", () => {
  it("sends the waiting farmers on its own when the app opens", async () => {
    const farmer = await seedFarmer()
    const fetchMock = fakeServer({
      "POST /api/sync": () =>
        json(200, { results: [{ id: farmer.id, outcome: "created" }] }),
    })
    renderRoute("/sync")
    await waitFor(async () =>
      expect((await db.farmers.get(farmer.id))!.syncStatus).toBe("synced")
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]!.body))
    expect(body.farmers[0]).toMatchObject({
      id: farmer.id,
      fullName: "Ama Boateng",
    })
    expect(body.farmers[0]).not.toHaveProperty("syncStatus")
    expect(await db.outbox.count()).toBe(0)
    expect(
      await screen.findByRole("heading", { name: "Everything is sent" })
    ).toBeInTheDocument()
    expect(screen.getByText(/^Last sent today \d\d:\d\d/)).toBeInTheDocument()
  })

  it("Sync now: explains a failure, then marks refused farmers to fix", async () => {
    const ok = await seedFarmer({ fullName: "Ama Boateng" })
    const bad = await seedFarmer({ fullName: "Mariama Alhassan" })
    let up = false
    fakeServer({
      "POST /api/sync": () => {
        if (!up) throw new TypeError("offline")
        return json(200, {
          results: [
            { id: ok.id, outcome: "created" },
            {
              id: bad.id,
              outcome: "invalid",
              problem: "Phone number is too short",
            },
          ],
        })
      },
    })
    renderRoute("/sync")
    expect(
      await screen.findByRole("heading", { name: "2 farmers not sent yet" })
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Sync now" }))
    expect(
      await screen.findByText(/No network. Your farmers are safe/)
    ).toBeInTheDocument()
    expect((await db.outbox.toArray()).every((e) => e.attempts >= 1)).toBe(true)

    up = true
    await userEvent.click(screen.getByRole("button", { name: "Sync now" }))
    expect(
      await screen.findByRole("heading", { name: "Everything is sent" })
    ).toBeInTheDocument()
    const fix = screen.getByRole("region", { name: "Needs fixing" })
    expect(within(fix).getByText("Mariama Alhassan")).toBeInTheDocument()
    expect(
      within(fix).getByText("Phone number is too short")
    ).toBeInTheDocument()
    expect((await db.farmers.get(bad.id))!.syncStatus).toBe("failed")
  })
})

describe("visits", () => {
  it("has nothing for today until a visit is logged", async () => {
    renderRoute("/visits")
    expect(
      await screen.findByRole("heading", { name: "No visits yet" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Choose a farmer" })
    ).toHaveAttribute("href", "/farmers")
  })

  it("logs a visit from the farmer page, queues it, and lists it", async () => {
    const farmer = await seedFarmer({
      fullName: "Hawa Issah",
      syncStatus: "synced",
    })
    const { router } = renderRoute(`/farmers/${farmer.id}`)
    await userEvent.click(
      await screen.findByRole("link", { name: "Log a visit" })
    )
    expect(
      await screen.findByRole("heading", { name: "Visit · Hawa Issah" })
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Save visit" }))
    expect(
      await screen.findByText(
        "Choose at least one thing you talked about or saw."
      )
    ).toBeInTheDocument()

    const talked = screen.getByRole("group", {
      name: "What did you talk about?",
    })
    await userEvent.click(
      within(talked).getByRole("checkbox", { name: "Pests" })
    )
    await userEvent.click(
      within(talked).getByRole("checkbox", { name: "Weather" })
    )
    const saw = screen.getByRole("group", {
      name: "What did you see on the farm?",
    })
    await userEvent.click(within(saw).getByRole("checkbox", { name: "Pests" }))
    await userEvent.type(
      screen.getByRole("textbox", { name: "Notes" }),
      "Spray in the evening"
    )
    await userEvent.click(screen.getByRole("radio", { name: "In 2 weeks" }))
    await userEvent.click(screen.getByRole("button", { name: "Save visit" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/visits"))
    const [visit] = await db.visits.toArray()
    expect(visit).toMatchObject({
      farmerId: farmer.id,
      status: "done",
      topics: ["pests", "weather"],
      observations: ["pests"],
      notes: "Spray in the evening",
      nextVisit: "two_weeks",
      syncStatus: "waiting",
    })
    expect(await db.outbox.where("kind").equals("visit").count()).toBe(1)
    expect(await screen.findByText("1 visit today")).toBeInTheDocument()
    expect(screen.getByText("Hawa Issah")).toBeInTheDocument()
  })
})

describe("help and install", () => {
  it("answers common questions, without a help line until one is set", async () => {
    renderRoute("/help")
    await userEvent.click(await screen.findByText("What to do with no network"))
    expect(
      screen.getByText(/Keep working. Farmers and visits are saved/)
    ).toBeVisible()
    expect(
      screen.queryByText("Call the MoFA help line")
    ).not.toBeInTheDocument()
  })

  it("shows the steps for Android or iPhone", async () => {
    renderRoute("/install")
    expect(await screen.findByText("Tap Install below.")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Install AgroConnect" })
    ).toBeDisabled()
    await userEvent.click(screen.getByRole("radio", { name: "iPhone" }))
    expect(
      screen.getByText("In Safari, tap the Share button.")
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Install AgroConnect" })
    ).not.toBeInTheDocument()
  })
})

describe("farmer app", () => {
  it("has its own home, help and profile", async () => {
    renderRoute("/farmer", { as: "farmer" })
    expect(
      await screen.findByRole("heading", { name: "Ama" })
    ).toBeInTheDocument()
    // farmers use phones (ADR 0024): the bottom bar is the only navigation
    for (const place of ["Home", "Market", "Money", "Help", "Profile"])
      expect(screen.getAllByRole("link", { name: place })).toHaveLength(1)
    await userEvent.click(screen.getAllByRole("link", { name: "Help" })[0])
    expect(
      await screen.findByText("How to check my details")
    ).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole("link", { name: "Profile" })[0])
    expect(
      await screen.findByText("Farmer · Northern · Tolon District")
    ).toBeInTheDocument()
    expect(screen.queryByText("Stored on this device")).not.toBeInTheDocument()
  })
})
