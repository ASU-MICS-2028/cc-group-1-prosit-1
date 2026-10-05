import { screen } from "@testing-library/react"
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
    expect(await screen.findByText("Ama Boateng")).toBeInTheDocument()
    for (const name of ["Ama Boateng", "Kwame Mensah", "Fatima Abdulai"]) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
    expect(screen.getByRole("button", { name: "All (3)" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(
      screen.getByRole("button", { name: "1 waiting" })
    ).toBeInTheDocument()
  })

  it("filters by search text", async () => {
    renderRoute("/farmers")
    await userEvent.type(await screen.findByRole("searchbox"), "kwame")
    expect(screen.getByText("Kwame Mensah")).toBeInTheDocument()
    expect(screen.queryByText("Ama Boateng")).not.toBeInTheDocument()
  })

  it("filters by sync state", async () => {
    renderRoute("/farmers")
    await userEvent.click(
      await screen.findByRole("button", { name: "1 failed" })
    )
    expect(screen.getByText("Fatima Abdulai")).toBeInTheDocument()
    expect(screen.queryByText("Ama Boateng")).not.toBeInTheDocument()
  })

  it("says so when nothing matches", async () => {
    renderRoute("/farmers")
    await userEvent.type(await screen.findByRole("searchbox"), "zzz")
    expect(
      screen.getByText("No farmer matches your search.")
    ).toBeInTheDocument()
  })

  it("shows recent farmers on the home page too", async () => {
    renderRoute("/")
    expect(await screen.findByText("Ama Boateng")).toBeInTheDocument()
    expect(screen.getByText("1 waiting")).toBeInTheDocument()
  })

  it("explains what is left to sync", async () => {
    renderRoute("/sync")
    expect(
      await screen.findByText(/Records are saved on this phone first/)
    ).toBeInTheDocument()
  })
})
