import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { db } from "@/db/local"
import { fakeServer, json, seedFarmer } from "@/test/fakes"
import { renderRoute } from "@/test/renderRoute"

afterEach(() => vi.unstubAllGlobals())

const coop = {
  id: "c1",
  name: "Tolon Women Farmers",
  community: "Tolon",
  district: "Tolon",
  leaderName: "Ama Boateng",
  leaderPhoneE164: null,
  members: [{ farmerId: "f1", fullName: "Ama Boateng", isLeader: true }],
  savings: { group: 0, mine: 0 },
  openOrder: null,
  openSale: null,
  nextMeeting: null,
}

describe("the officer's cooperatives (CooperativeService)", () => {
  it("starts a cooperative with a synced farmer as leader, checking each field", async () => {
    const farmer = await seedFarmer({ fullName: "Ama Boateng" })
    await db.farmers.update(farmer.id, { syncStatus: "synced" })
    const created: unknown[] = []
    let list: unknown[] = []
    fakeServer({
      "GET /api/officer/cooperatives": () => json(200, list),
      "POST /api/officer/cooperatives": (body) => {
        created.push(body)
        list = [coop]
        return json(200, coop)
      },
    })
    renderRoute("/cooperatives")
    expect(
      await screen.findByText(/You have no cooperatives yet/)
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Start one" }))
    await userEvent.click(
      screen.getByRole("button", { name: "Start the cooperative" })
    )
    expect(screen.getAllByText("Fill this in.")).toHaveLength(3)

    await userEvent.type(screen.getByLabelText("Name"), "Tolon Women Farmers")
    await userEvent.type(screen.getByLabelText("Community"), "Tolon")
    await userEvent.selectOptions(screen.getByLabelText("Leader"), farmer.id)
    await userEvent.click(
      screen.getByRole("button", { name: "Start the cooperative" })
    )
    expect(
      await screen.findByRole("heading", { name: "Tolon Women Farmers" })
    ).toBeInTheDocument()
    expect(created).toEqual([
      {
        name: "Tolon Women Farmers",
        community: "Tolon",
        leaderFarmerId: farmer.id,
      },
    ])
  })

  it("opens a group order once every field is right", async () => {
    const orders: unknown[] = []
    fakeServer({
      "GET /api/officer/cooperatives": () => json(200, [coop]),
      "POST /api/officer/cooperatives/c1/orders": (body) => {
        orders.push(body)
        return new Response(null, { status: 204 })
      },
    })
    renderRoute("/cooperatives")
    const card = await screen.findByRole("region", {
      name: "Tolon Women Farmers",
    })
    await userEvent.click(
      within(card).getByRole("button", { name: "Group order" })
    )
    await userEvent.type(within(card).getByLabelText("Product"), "NPK")
    await userEvent.type(
      within(card).getByLabelText("Dealer"),
      "Tolon Agro Inputs"
    )
    await userEvent.type(
      within(card).getByLabelText("Group price per bag (GH₵)"),
      "170"
    )
    await userEvent.type(
      within(card).getByLabelText("Price alone per bag (GH₵)"),
      "150"
    )
    await userEvent.type(within(card).getByLabelText("Target bags"), "0")
    await userEvent.click(
      within(card).getByRole("button", { name: "Open the group order" })
    )
    expect(
      within(card).getByText(
        "The price alone should be at least the group price."
      )
    ).toBeInTheDocument()
    expect(
      within(card).getByText("Enter a number above zero.")
    ).toBeInTheDocument()
    expect(orders).toEqual([])

    await userEvent.clear(
      within(card).getByLabelText("Price alone per bag (GH₵)")
    )
    await userEvent.type(
      within(card).getByLabelText("Price alone per bag (GH₵)"),
      "190"
    )
    await userEvent.clear(within(card).getByLabelText("Target bags"))
    await userEvent.type(within(card).getByLabelText("Target bags"), "120")
    await userEvent.type(within(card).getByLabelText("Closes on"), "2099-12-01")
    await userEvent.click(
      within(card).getByRole("button", { name: "Open the group order" })
    )
    await waitFor(() =>
      expect(orders).toEqual([
        {
          product: "NPK",
          dealer: "Tolon Agro Inputs",
          unitPrice: 170,
          alonePrice: 190,
          targetBags: 120,
          closesOn: "2099-12-01",
        },
      ])
    )
  })
})
