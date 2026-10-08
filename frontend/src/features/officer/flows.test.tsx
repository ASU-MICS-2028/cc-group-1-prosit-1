import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fakeServer } from "@/test/fakes"
import { renderRoute } from "@/test/renderRoute"

beforeEach(() => {
  fakeServer({}) // sample data until the backend has these endpoints
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe("officer requests, money and market (sample data)", () => {
  it("lists requests and answers one with advice", async () => {
    renderRoute("/requests")
    expect(
      await screen.findByRole("heading", { name: "Requests" })
    ).toBeInTheDocument()
    expect(screen.getByText("3 open")).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("link", { name: /Yellow leaves on maize/ })
    )
    expect(await screen.findByText(/Nitrogen shortage/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Send advice" }))
    expect(screen.getByRole("status")).toHaveTextContent(
      "Advice sent to Salifu Iddrisu by SMS"
    )
  })

  it("approves a cooperative order from the requests", async () => {
    renderRoute("/requests/r4")
    await userEvent.click(
      await screen.findByRole("button", { name: "Approve order" })
    )
    expect(screen.getByRole("status")).toHaveTextContent("Order approved")
  })

  it("sends a loan request to the loans list", async () => {
    renderRoute("/requests/r3")
    expect(
      await screen.findByRole("link", { name: "Open loans" })
    ).toHaveAttribute("href", "/money/loans")
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
