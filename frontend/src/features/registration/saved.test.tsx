import { screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { fakeServer, json, seedFarmer } from "@/test/fakes"
import { renderRoute } from "@/test/renderRoute"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function openSaved() {
  const farmer = await seedFarmer({ fullName: "Ama Boateng", gender: "female" })
  renderRoute("/register/saved", {
    state: { id: farmer.id, name: farmer.fullName, gender: farmer.gender },
  })
  return farmer
}

describe("after saving a farmer", () => {
  it("online: sends straight away and says the farmer is registered", async () => {
    fakeServer({
      "POST /api/sync": (body) =>
        json(200, {
          results: (body as { farmers: { id: string }[] }).farmers.map((f) => ({
            id: f.id,
            outcome: "created",
          })),
        }),
    })
    await openSaved()
    expect(
      await screen.findByRole("heading", { name: "Ama Boateng is registered" })
    ).toBeInTheDocument()
    expect(screen.getByText("Sent to MoFA")).toBeInTheDocument()
    expect(
      screen.getByText("Her details are with MoFA now.")
    ).toBeInTheDocument()
    expect(screen.queryByText("Waiting to sync")).not.toBeInTheDocument()
  })

  it("offline: saved on this phone, waiting to sync", async () => {
    const fetchMock = fakeServer({})
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    await openSaved()
    expect(await screen.findByText("Saved on this phone")).toBeInTheDocument()
    expect(screen.getByText("Waiting to sync")).toBeInTheDocument()
    expect(
      screen.getByText(/We will send her details to MoFA automatically/)
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("online but the server cannot be reached: waiting to sync", async () => {
    fakeServer({}) // every request fails like a dropped connection
    await openSaved()
    expect(await screen.findByText("Saved on this phone")).toBeInTheDocument()
  })

  it("refused by the server: needs fixing, with the reason", async () => {
    fakeServer({
      "POST /api/sync": (body) =>
        json(200, {
          results: (body as { farmers: { id: string }[] }).farmers.map((f) => ({
            id: f.id,
            outcome: "invalid",
            problem: "The phone number belongs to another farmer.",
          })),
        }),
    })
    const farmer = await openSaved()
    expect(
      await screen.findByText("The phone number belongs to another farmer.")
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Fix the details" })
    ).toHaveAttribute("href", `/farmers/${farmer.id}`)
  })
})
