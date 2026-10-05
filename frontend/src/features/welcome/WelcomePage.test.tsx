import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { renderRoute } from "@/test/renderRoute"

describe("first-run language screen", () => {
  it("asks which language, with English chosen to start", async () => {
    renderRoute("/welcome", { firstRun: true })
    expect(
      await screen.findByRole("heading", {
        name: "Which language do you speak?",
      })
    ).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /English/ })).toBeChecked()
    expect(
      screen.getByRole("button", { name: "Continue in English" })
    ).toBeInTheDocument()
  })

  it("names the chosen language on the button but remembers nothing until Continue", async () => {
    renderRoute("/welcome", { firstRun: true })
    await userEvent.click(await screen.findByRole("radio", { name: /Twi/ }))
    expect(
      screen.getByRole("button", { name: "Continue in Twi" })
    ).toBeInTheDocument()
    expect(localStorage.getItem("agroconnect.lang")).toBeNull()
  })

  it("saves the language and opens the app on Continue", async () => {
    const { router } = renderRoute("/welcome", { firstRun: true })
    await userEvent.click(await screen.findByRole("radio", { name: /Eʋegbe/ }))
    await userEvent.click(
      screen.getByRole("button", { name: "Continue in Eʋegbe" })
    )
    await waitFor(() => expect(router.state.location.pathname).toBe("/"))
    expect(localStorage.getItem("agroconnect.lang")).toBe("ee")
  })
})
