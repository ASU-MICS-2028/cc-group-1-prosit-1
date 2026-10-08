import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fakeServer, json } from "@/test/fakes"
import { renderRoute } from "@/test/renderRoute"

beforeEach(() => {
  fakeServer({}) // these screens use sample data; no network needed
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const go = async (name: string | RegExp) =>
  userEvent.click(await screen.findByRole("link", { name }))

const linked = {
  network: "mtn",
  phoneE164: "+233240001234",
  nameOnWallet: "Ama Boateng",
  canReceive: true,
}

const payment = (status: string, extra: Record<string, unknown> = {}) => ({
  reference: "agc_1",
  purpose: "inputs",
  description: "Tolon Agro Inputs",
  amount: 525,
  network: "mtn",
  status,
  message: null,
  createdAt: new Date().toISOString(),
  ...extra,
})

/** The money server: a linked wallet unless told otherwise, and payment answers. */
function moneyServer(
  answers: Record<string, (body: unknown) => Response> = {}
) {
  return fakeServer({
    "/api/money": () =>
      json(200, { sample: false, wallet: linked, payments: [] }),
    ...answers,
  })
}

describe("farmer money", () => {
  it("shows the wallet, the four services and recent payments", async () => {
    moneyServer({
      "/api/money": () =>
        json(200, {
          sample: true,
          wallet: linked,
          payments: [payment("paid")],
        }),
    })
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
    expect(await screen.findByText("Tolon Agro Inputs")).toBeInTheDocument()
    expect(screen.getByText(/MTN MoMo · \+233 24 ••• 1234/)).toBeInTheDocument()
    expect(
      screen.getAllByText("Coming in a later phase").length
    ).toBeGreaterThan(0)
  })

  it("asks to link mobile money when none is linked", async () => {
    moneyServer({
      "/api/money": () =>
        json(200, { sample: false, wallet: null, payments: [] }),
    })
    renderRoute("/farmer/money", { as: "farmer" })
    expect(
      await screen.findByRole("link", { name: /Link your mobile money/ })
    ).toHaveAttribute("href", "/farmer/money/link")
    expect(await screen.findByText("No payments yet.")).toBeInTheDocument()
  })

  it("links the registered number on the chosen network", async () => {
    const fetchMock = moneyServer({
      "PUT /api/money/wallet": (body) =>
        json(200, {
          ...linked,
          network: (body as { network: string }).network,
        }),
    })
    const { router } = renderRoute("/farmer/money/link", { as: "farmer" })
    await userEvent.click(
      await screen.findByRole("radio", { name: /Telecel Cash/ })
    )
    await userEvent.click(
      screen.getByRole("button", { name: /Link \+233 24 ••• 1234/ })
    )
    expect(
      await screen.findByText("Telecel Cash is linked")
    ).toBeInTheDocument()
    expect(screen.getByText("Never stored")).toBeInTheDocument()
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT")
    expect(JSON.parse(String(put![1]!.body))).toEqual({ network: "telecel" })
    await go("Back to Money")
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/farmer/money")
    )
  })

  it("buys inputs and pays once the farmer approves on the phone", async () => {
    const fetchMock = moneyServer({
      "POST /api/money/payments": () => json(200, payment("waiting")),
      "/api/money/payments/agc_1": () => json(200, payment("paid")),
    })
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
    await userEvent.click(
      await screen.findByRole("button", { name: /^Pay GH₵/ })
    )

    expect(await screen.findByText(/paid$/)).toBeInTheDocument()
    expect(screen.getByText("agc_1")).toBeInTheDocument()
    const sent = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "POST"
    )
    expect(JSON.parse(String(sent![1]!.body))).toMatchObject({
      purpose: "inputs",
      amount: 690,
    })
    await go("Track delivery")
    expect(await screen.findByText("On the way")).toBeInTheDocument()
  })

  it("takes the code a network texts, and explains a payment that fails", async () => {
    let paid = false
    moneyServer({
      "/api/money/payments/agc_1": () =>
        json(
          200,
          paid
            ? payment("paid")
            : payment("needs_code", { message: "Enter the code we sent" })
        ),
      "POST /api/money/payments/agc_1/code": () => {
        paid = true
        return json(200, payment("paid"))
      },
    })
    const { router, unmount } = renderRoute("/farmer/money/pay/agc_1", {
      as: "farmer",
    })
    expect(
      await screen.findByText("Enter the code we sent")
    ).toBeInTheDocument()
    await userEvent.type(
      screen.getByLabelText("Code from your network"),
      "1234"
    )
    await userEvent.click(screen.getByRole("button", { name: "Send code" }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/farmer/money")
    )
    unmount()

    moneyServer({
      "/api/money/payments/agc_1": () =>
        json(200, payment("failed", { message: "Insufficient funds" })),
    })
    renderRoute("/farmer/money/pay/agc_1", { as: "farmer" })
    expect(
      await screen.findByText("The payment did not go through")
    ).toBeInTheDocument()
    expect(screen.getByText("Insufficient funds")).toBeInTheDocument()
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
