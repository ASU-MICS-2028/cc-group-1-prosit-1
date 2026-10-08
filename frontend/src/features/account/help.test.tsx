import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { fakeServer, json } from "@/test/fakes"
import { renderRoute } from "@/test/renderRoute"

afterEach(() => vi.unstubAllGlobals())

const asked = {
  id: "11111111-1111-4111-8111-111111111111",
  category: "money",
  text: "When is my loan due?",
  crop: null,
  problem: null,
  hasVoiceNote: false,
  voiceSeconds: null,
  status: "waiting",
  officerName: "Fuseini Alhassan",
  answer: null,
  answeredAt: null,
  createdAt: "2026-10-08T09:12:00Z",
}

describe("Get help (HelpService)", () => {
  it("needs a topic and a question, then sends it to the officer", async () => {
    const sent: unknown[] = []
    fakeServer({
      "POST /api/help/requests": (body) => {
        sent.push(body)
        return json(200, asked)
      },
      "GET /api/help/requests": () => json(200, [asked]),
    })
    const { router } = renderRoute("/farmer/help/ask", { as: "farmer" })
    await userEvent.click(
      await screen.findByRole("button", { name: "Send to my officer" })
    )
    expect(
      screen.getByText("Choose what the problem is about.")
    ).toBeInTheDocument()
    expect(
      screen.getByText("Record your question or type it.")
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole("radio", { name: "Money or loan" }))
    await userEvent.type(
      screen.getByLabelText("Or type it (optional)"),
      "When is my loan due?"
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Send to my officer" })
    )
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        `/farmer/help/requests/${asked.id}`
      )
    )
    expect(sent).toEqual([
      expect.objectContaining({
        category: "money",
        text: "When is my loan due?",
      }),
    ])
    expect(
      await screen.findByText("Fuseini, your extension officer, has it")
    ).toBeInTheDocument()
  })

  it("says so when the phone cannot record", async () => {
    vi.stubGlobal("MediaRecorder", undefined)
    fakeServer({})
    renderRoute("/farmer/help/ask", { as: "farmer" })
    const hold = await screen.findByRole("button", {
      name: /Hold to record your question/,
    })
    hold.focus()
    await userEvent.keyboard("{Enter}")
    expect(
      await screen.findByText(/This phone cannot record here/)
    ).toBeInTheDocument()
  })

  it("shows the answer and takes the farmer's feedback", async () => {
    const answered = {
      ...asked,
      status: "answered",
      answer: "Your loan is due after harvest, by February 2027.",
      answeredAt: "2026-10-08T10:05:00Z",
    }
    fakeServer({
      "GET /api/help/requests": () => json(200, [answered]),
      [`POST /api/help/requests/${asked.id}/feedback`]: () =>
        json(200, { ...answered, status: "still_needs_help" }),
    })
    renderRoute(`/farmer/help/requests/${asked.id}`, { as: "farmer" })
    expect(
      await screen.findByText(
        "Your loan is due after harvest, by February 2027."
      )
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("button", { name: "I still need help" })
    )
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Sent back to your officer"
    )
  })

  it("lists the farmer's questions on Help", async () => {
    fakeServer({
      "GET /api/help/requests": () => json(200, [asked]),
      "GET /api/farmer/me": () => json(404, {}),
    })
    renderRoute("/farmer/help", { as: "farmer" })
    expect(
      await screen.findByRole("link", { name: /When is my loan due\?/ })
    ).toHaveAttribute("href", `/farmer/help/requests/${asked.id}`)
    expect(
      screen.getByRole("link", { name: /Ask a question/ })
    ).toHaveAttribute("href", "/farmer/help/ask")
  })
})
