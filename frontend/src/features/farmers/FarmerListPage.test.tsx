import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { renderRoute } from "@/test/renderRoute"
import type { FarmerSummary } from "./farmers"

const SAMPLE: FarmerSummary[] = [
  {
    id: "1",
    name: "Ama Boateng",
    village: "Tolon",
    phone: "+233240001234",
    status: "waiting",
  },
  {
    id: "2",
    name: "Kwame Mensah",
    village: "Savelugu",
    phone: "+233550005678",
    status: "synced",
  },
  {
    id: "3",
    name: "Fatima Abdulai",
    village: "Tamale",
    phone: "+233200004321",
    status: "failed",
  },
]

vi.mock("./farmers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./farmers")>()),
  useFarmers: () => SAMPLE,
}))

describe("farmer list with farmers", () => {
  it("lists every farmer with the count per sync state", async () => {
    renderRoute("/farmers")
    expect((await screen.findAllByText("Ama Boateng")).length).toBeGreaterThan(
      0
    )
    for (const name of ["Ama Boateng", "Kwame Mensah", "Fatima Abdulai"]) {
      // once in the phone list, once in the computer table (the screen width shows one)
      expect(
        screen.getAllByRole("link", { name: new RegExp(name) }).length
      ).toBeGreaterThanOrEqual(2)
    }
    expect(screen.getByRole("button", { name: "All 3" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(
      screen.getByRole("button", { name: "Waiting 1" })
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole("link", { name: "1 waiting" })[0]
    ).toHaveAttribute("href", "/sync")
  })

  it("filters by search text", async () => {
    renderRoute("/farmers")
    await userEvent.type(
      await screen.findByRole("searchbox", { name: "Name or phone number" }),
      "kwame"
    )
    expect(screen.getAllByText("Kwame Mensah").length).toBeGreaterThan(0)
    expect(screen.queryByText("Ama Boateng")).not.toBeInTheDocument()
  })

  it("filters by sync state", async () => {
    renderRoute("/farmers")
    await userEvent.click(
      await screen.findByRole("button", { name: "To fix 1" })
    )
    // the filter lives in the address, so the list updates a moment after the tap
    await waitFor(() =>
      expect(screen.queryByText("Ama Boateng")).not.toBeInTheDocument()
    )
    expect(screen.getAllByText("Fatima Abdulai").length).toBeGreaterThan(0)
  })

  it("says so when nothing matches", async () => {
    renderRoute("/farmers")
    await userEvent.type(
      await screen.findByRole("searchbox", { name: "Name or phone number" }),
      "zzz"
    )
    expect(
      screen.getByText("No farmer matches your search.")
    ).toBeInTheDocument()
  })

  it("shows recent farmers on the home page too", async () => {
    renderRoute("/")
    expect(await screen.findByText("Ama Boateng")).toBeInTheDocument()
    expect(
      screen.getAllByRole("link", { name: "1 waiting" })[0]
    ).toBeInTheDocument()
  })

  it("explains what is left to sync", async () => {
    renderRoute("/sync")
    expect(
      await screen.findByRole("heading", { name: "1 farmer not sent yet" })
    ).toBeInTheDocument()
    expect(screen.getByText("Needs fixing")).toBeInTheDocument()
  })
})
