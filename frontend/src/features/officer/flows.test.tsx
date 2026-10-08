import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fakeServer, json } from "@/test/fakes"
import { renderRoute } from "@/test/renderRoute"

beforeEach(() => {
  fakeServer({}) // sample data until the backend has these endpoints
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const question = {
  id: "11111111-1111-4111-8111-111111111111",
  farmerId: "22222222-2222-4222-8222-222222222222",
  farmerName: "Hawa Issah",
  community: "Tolon",
  category: "crops",
  text: "Holes in my maize leaves",
  crop: "maize",
  problem: "fall_armyworm",
  hasVoiceNote: false,
  voiceSeconds: null,
  status: "waiting",
  officerId: "33333333-3333-4333-8333-333333333333",
  officerName: "Fuseini Alhassan",
  answer: null,
  overdue: false,
  createdAt: new Date().toISOString(),
  answeredAt: null,
  remindedAt: null,
}

describe("officer requests, money and market", () => {
  it("lists the farmers' questions and answers one with advice (HelpService)", async () => {
    const answers: unknown[] = []
    fakeServer({
      "GET /api/officer/requests": () =>
        json(200, { open: 1, requests: [question] }),
      [`POST /api/officer/requests/${question.id}/answer`]: (body) => {
        answers.push(body)
        return json(200, {
          ...question,
          status: "answered",
          answer: (body as { advice: string }).advice,
        })
      },
    })
    renderRoute(`/requests/${question.id}`)
    expect(
      await screen.findByRole("heading", {
        name: "Maize: Possible fall armyworm",
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/The app thinks: Possible fall armyworm/)
    ).toBeInTheDocument()
    // no advice yet: says so instead of sending nothing
    await userEvent.click(screen.getByRole("button", { name: "Send advice" }))
    expect(
      screen.getByText("Write your advice before sending.")
    ).toBeInTheDocument()
    await userEvent.type(
      screen.getByLabelText("Your advice"),
      "Crush the egg masses."
    )
    await userEvent.click(screen.getByRole("button", { name: "Send advice" }))
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Advice sent to Hawa Issah"
    )
    expect(answers).toEqual([{ advice: "Crush the egg masses." }])
    expect(
      screen.getByRole("link", { name: "Add a farm visit" })
    ).toHaveAttribute("href", `/farmers/${question.farmerId}/visit`)
  })

  it("says when there are no questions yet", async () => {
    fakeServer({
      "GET /api/officer/requests": () => json(200, { open: 0, requests: [] }),
    })
    renderRoute("/requests")
    expect(
      await screen.findByText(/No questions from your farmers yet/)
    ).toBeInTheDocument()
  })

  it("shows money and farm health", async () => {
    renderRoute("/money")
    expect(
      await screen.findByRole("heading", { name: "Money and farm health" })
    ).toBeInTheDocument()
    expect(screen.getByText("GH₵ 48,200")).toBeInTheDocument()
    expect(screen.getByText("Streak virus")).toBeInTheDocument()
    // The weekly chart: an axis in cedis, and each week's amount in full for screen readers
    const weeks = screen.getByRole("table", { name: "Paid to shops by week" })
    expect(
      within(weeks).getByRole("row", { name: /Week 4/ })
    ).toHaveTextContent("Week 4GH₵ 15,800")
    expect(screen.getByText("15.8k")).toBeInTheDocument()
    expect(screen.getByText("20k")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /2 loans to review/ })
    ).toHaveAttribute("href", "/money/loans")
  })

  it("reviews a loan with its reasons and approves it", async () => {
    renderRoute("/money/loans/l1")
    expect(
      await screen.findByText("Ama Boateng asks for GH₵ 800")
    ).toBeInTheDocument()
    expect(
      screen.getByText("No previous loan to check repayment")
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole("link", { name: "Approve GH₵ 800" }))
    expect(
      await screen.findByText("Ama's loan is approved")
    ).toBeInTheDocument()
  })

  it("lists loans, and a decided loan shows its status", async () => {
    renderRoute("/money/loans/l5")
    expect(await screen.findByText("Declined")).toBeInTheDocument()
  })

  it("shows market prices", async () => {
    renderRoute("/market")
    expect(
      await screen.findByRole("heading", { name: "Market prices" })
    ).toBeInTheDocument()
    expect(screen.getByText("Cassava")).toBeInTheDocument()
  })
})
