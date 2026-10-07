import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fakeServer } from "@/test/fakes"
import { renderRoute } from "@/test/renderRoute"

beforeEach(() => {
  fakeServer({}) // these screens use sample data; no network needed
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const go = async (name: string | RegExp) =>
  userEvent.click(await screen.findByRole("link", { name }))

describe("farmer money (sample data)", () => {
  it("shows the wallet, the four services and recent payments", async () => {
    renderRoute("/farmer/money", { as: "farmer" })
    expect(
      await screen.findByRole("heading", { name: "Money" })
    ).toBeInTheDocument()
    for (const service of [
      /Buy inputs/,
      /Seed loan/,
      /Crop insurance/,
      /Ask a buyer/,
    ])
      expect(screen.getByRole("link", { name: service })).toBeInTheDocument()
    expect(screen.getByText("Tolon Agro Inputs")).toBeInTheDocument()
    expect(screen.getAllByText("Sample data").length).toBeGreaterThan(0)
  })

  it("links mobile money and approves on the phone", async () => {
    const { router } = renderRoute("/farmer/money/link", { as: "farmer" })
    await userEvent.click(
      await screen.findByRole("radio", { name: /Telecel Cash/ })
    )
    expect(screen.getByRole("radio", { name: /Telecel Cash/ })).toBeChecked()
    await go(/Link 024/)
    expect(await screen.findByText("No message came?")).toBeInTheDocument()
    await go("I have approved it")
    expect(await screen.findByText("MTN MoMo is linked")).toBeInTheDocument()
    expect(screen.getByText("Never stored")).toBeInTheDocument()
    await go("Back to Money")
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/farmer/money")
    )
  })

  it("buys inputs: basket, shop, pay, paid, delivery", async () => {
    renderRoute("/farmer/money/buy", { as: "farmer" })
    expect(await screen.findByText("GH₵ 525")).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("button", { name: "More Urea fertiliser" })
    )
    expect(screen.getByText("GH₵ 690")).toBeInTheDocument()
    await go("Choose a shop")
    await userEvent.click(
      await screen.findByRole("radio", { name: /Tamale Agro Mart/ })
    )
    await go("Check and pay")
    expect(await screen.findByText("Pick up at the shop")).toBeInTheDocument()
    await go(/^Pay GH₵/)
    expect(await screen.findByText(/paid$/)).toBeInTheDocument()
    await go("Track delivery")
    expect(await screen.findByText("On the way")).toBeInTheDocument()
  })

  it("asks for a smaller seed loan and sends it", async () => {
    renderRoute("/farmer/money/loan", { as: "farmer" })
    expect(
      await screen.findByText("You can borrow up to GH₵ 800")
    ).toBeInTheDocument()
    await go("I want less")
    expect(await screen.findByText("How much do you need?")).toBeInTheDocument()
    await go(/^Apply for/)
    expect(await screen.findByText("Loan request sent")).toBeInTheDocument()
  })

  it("insures the crop", async () => {
    renderRoute("/farmer/money/insurance", { as: "farmer" })
    expect(
      await screen.findByText("If the rain fails, you get paid")
    ).toBeInTheDocument()
    await go("Insure for GH₵ 30")
    expect(await screen.findByText("Your crop is insured")).toBeInTheDocument()
  })

  it("asks a buyer to pay", async () => {
    renderRoute("/farmer/money/get-paid", { as: "farmer" })
    expect(await screen.findByText("What did you sell?")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("radio", { name: "Groundnut" }))
    await go("Send request")
    expect(await screen.findByText("Request sent")).toBeInTheDocument()
    expect(screen.getByText("Groundnut")).toBeInTheDocument()
  })
})

describe("cooperative (sample data)", () => {
  it("shows savings, order, meeting and sale", async () => {
    renderRoute("/farmer/cooperative", { as: "farmer" })
    for (const row of [
      /Group savings/,
      /Group order/,
      /Next meeting/,
      /Sell Maize together/,
    ])
      expect(await screen.findByRole("link", { name: row })).toBeInTheDocument()
  })

  it("adds savings", async () => {
    renderRoute("/farmer/cooperative/savings", { as: "farmer" })
    await go("Add GH₵ 20")
    expect(await screen.findByText("GH₵ 20 added")).toBeInTheDocument()
  })

  it("confirms the meeting", async () => {
    renderRoute("/farmer/cooperative/meeting", { as: "farmer" })
    await go("I will come")
    expect(await screen.findByText("See you there")).toBeInTheDocument()
  })

  it("joins the group order with more bags", async () => {
    renderRoute("/farmer/cooperative/order", { as: "farmer" })
    await userEvent.click(
      await screen.findByRole("button", { name: "More Bags" })
    )
    await go("Join with 3 bags")
    expect(await screen.findByText("You ordered 3 bags")).toBeInTheDocument()
  })

  it("adds bags to the group sale", async () => {
    renderRoute("/farmer/cooperative/sell", { as: "farmer" })
    await userEvent.click(
      await screen.findByRole("button", { name: "Fewer Bags" })
    )
    await go(/^Add \d+ bags?$/)
    expect(await screen.findByText(/bags? added$/)).toBeInTheDocument()
  })
})
