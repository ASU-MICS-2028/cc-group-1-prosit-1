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
      /Get a loan/,
      /Insure crops/,
      /From buyers/,
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
    // nothing filled in: each field says what is missing
    await userEvent.click(screen.getByRole("button", { name: "Send request" }))
    expect(screen.getAllByText("Fill this in.")).toHaveLength(3)
    await userEvent.click(screen.getByRole("radio", { name: "Groundnut" }))
    await userEvent.type(
      screen.getByRole("textbox", { name: "Amount (GH₵)" }),
      "20000"
    )
    await userEvent.type(
      screen.getByRole("textbox", { name: "Buyer's phone number" }),
      "12345"
    )
    await userEvent.click(screen.getByRole("button", { name: "Send request" }))
    expect(
      screen.getByText("The most at once is GH₵ 10,000.")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Enter a Ghana mobile number, like 024 000 0000.")
    ).toBeInTheDocument()
    await userEvent.clear(screen.getByRole("textbox", { name: "Amount (GH₵)" }))
    await userEvent.type(
      screen.getByRole("textbox", { name: "Amount (GH₵)" }),
      "1200"
    )
    await userEvent.clear(
      screen.getByRole("textbox", { name: "Buyer's phone number" })
    )
    await userEvent.type(
      screen.getByRole("textbox", { name: "Buyer's phone number" }),
      "024 555 0182"
    )
    await userEvent.click(screen.getByRole("button", { name: "Send request" }))
    expect(await screen.findByText("Request sent")).toBeInTheDocument()
    expect(screen.getByText("Groundnut")).toBeInTheDocument()
  })
})

const coop = {
  id: "c1",
  name: "Tolon Farmers Cooperative",
  community: "Tolon",
  district: "Tolon",
  leaderName: "Mariama Alhassan",
  leaderPhoneE164: "+233241000001",
  members: [
    { farmerId: "f0", fullName: "Mariama Alhassan", isLeader: true },
    { farmerId: "f1", fullName: "Ama Boateng", isLeader: false },
  ],
  savings: { group: 12400, mine: 240 },
  openOrder: {
    id: "o1",
    product: "NPK fertiliser",
    dealer: "Tolon Agro Inputs",
    unitPrice: 150,
    alonePrice: 170,
    targetBags: 120,
    orderedBags: 64,
    closesOn: "2099-10-18",
    status: "open",
    myBags: 0,
  },
  openSale: {
    id: "s1",
    crop: "Maize",
    buyer: "Savelugu Grain Traders",
    pricePerKg: 6.8,
    marketPricePerKg: 6.5,
    targetKg: 20000,
    pledgedKg: 18000,
    status: "open",
    myBags: 0,
    kgPerBag: 100,
    pledgers: 41,
  },
  nextMeeting: {
    id: "m1",
    startsAt: "2099-10-10T10:00:00Z",
    place: "Tolon community centre",
    topic: "Selling maize together",
    bring: "How many bags you can sell",
    coming: null,
    comingCount: 12,
  },
}

describe("cooperative (CooperativeService)", () => {
  it("shows the group, savings, order, meeting and sale", async () => {
    fakeServer({ "GET /api/cooperative": () => json(200, coop) })
    renderRoute("/farmer/cooperative", { as: "farmer" })
    for (const row of [
      /Group savings: GH₵ 12,400/,
      /Group order: NPK fertiliser/,
      /Next meeting/,
      /Sell Maize together/,
    ])
      expect(await screen.findByRole("link", { name: row })).toBeInTheDocument()
    expect(screen.getByText(/2 members/)).toBeInTheDocument()
  })

  it("says plainly when the farmer is not in a cooperative", async () => {
    fakeServer({
      "GET /api/cooperative": () =>
        json(404, { title: "NOT_IN_A_COOPERATIVE", detail: "Not in one" }),
    })
    renderRoute("/farmer/cooperative", { as: "farmer" })
    expect(
      await screen.findByText(/You are not in a cooperative yet/)
    ).toBeInTheDocument()
  })

  it("saves with mobile money, approved on the phone", async () => {
    const asked: unknown[] = []
    fakeServer({
      "GET /api/cooperative": () => json(200, coop),
      "POST /api/cooperative/savings": (body) => {
        asked.push(body)
        return json(200, {
          reference: "agc_1",
          purpose: "savings",
          description: "Savings",
          amount: 50,
          network: "mtn",
          status: "paid",
          message: null,
          createdAt: "2026-10-08T09:00:00Z",
        })
      },
      "GET /api/money/payments/agc_1": () =>
        json(200, {
          reference: "agc_1",
          purpose: "savings",
          description: "Savings",
          amount: 50,
          network: "mtn",
          status: "paid",
          message: null,
          createdAt: "2026-10-08T09:00:00Z",
        }),
      "GET /api/money": () =>
        json(200, { sample: true, wallet: null, payments: [] }),
    })
    const { router } = renderRoute("/farmer/cooperative/savings", {
      as: "farmer",
    })
    await userEvent.click(await screen.findByRole("radio", { name: "GH₵ 50" }))
    await userEvent.click(screen.getByRole("button", { name: "Add GH₵ 50" }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        "/farmer/cooperative/savings/done"
      )
    )
    expect(asked).toEqual([{ amount: 50 }])
    expect(await screen.findByText("GH₵ 50 added")).toBeInTheDocument()
  })

  it("says to link a wallet when there is none", async () => {
    fakeServer({
      "GET /api/cooperative": () => json(200, coop),
      "POST /api/cooperative/savings": () =>
        json(400, {
          title: "NO_WALLET",
          detail: "Link your mobile money wallet first.",
        }),
    })
    renderRoute("/farmer/cooperative/savings", { as: "farmer" })
    await userEvent.click(
      await screen.findByRole("button", { name: "Add GH₵ 20" })
    )
    expect(
      await screen.findByRole("link", { name: "Link your mobile money first" })
    ).toHaveAttribute("href", "/farmer/money/link")
  })

  it("answers the meeting", async () => {
    const answers: unknown[] = []
    fakeServer({
      "GET /api/cooperative": () => json(200, coop),
      "PUT /api/cooperative/meetings/m1/rsvp": (body) => {
        answers.push(body)
        return new Response(null, { status: 204 })
      },
    })
    renderRoute("/farmer/cooperative/meeting", { as: "farmer" })
    await userEvent.click(
      await screen.findByRole("button", { name: "I cannot come" })
    )
    expect(
      await screen.findByText("Thank you for telling us")
    ).toBeInTheDocument()
    expect(answers).toEqual([{ coming: false }])
  })

  it("joins the group order with more bags", async () => {
    const orders: unknown[] = []
    fakeServer({
      "GET /api/cooperative": () => json(200, coop),
      "PUT /api/cooperative/orders/o1": (body) => {
        orders.push(body)
        return new Response(null, { status: 204 })
      },
    })
    renderRoute("/farmer/cooperative/order", { as: "farmer" })
    await userEvent.click(
      await screen.findByRole("button", { name: "More Bags" })
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Join with 2 bags" })
    )
    expect(await screen.findByText("You ordered 2 bags")).toBeInTheDocument()
    expect(orders).toEqual([{ bags: 2 }])
  })

  it("adds bags to the group sale", async () => {
    const pledges: unknown[] = []
    fakeServer({
      "GET /api/cooperative": () => json(200, coop),
      "PUT /api/cooperative/sales/s1": (body) => {
        pledges.push(body)
        return new Response(null, { status: 204 })
      },
    })
    renderRoute("/farmer/cooperative/sell", { as: "farmer" })
    await userEvent.click(
      await screen.findByRole("button", { name: "Fewer Bags" })
    )
    await userEvent.click(screen.getByRole("button", { name: "Add 4 bags" }))
    expect(await screen.findByText("4 bags added")).toBeInTheDocument()
    expect(pledges).toEqual([{ bags: 4 }])
  })
})
