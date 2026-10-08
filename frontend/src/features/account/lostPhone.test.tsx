import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { fakeServer } from "@/test/fakes"
import { renderRoute } from "@/test/renderRoute"

afterEach(() => vi.unstubAllGlobals())

describe("an officer reports a lost or stolen phone", () => {
  it("from Profile, choosing what happened", async () => {
    fakeServer({})
    renderRoute("/profile")
    await userEvent.click(
      await screen.findByRole("button", {
        name: /Report a lost or stolen phone/,
      })
    )
    const sheet = await screen.findByRole("dialog", {
      name: "Lost or stolen phone?",
    })
    await userEvent.click(within(sheet).getByRole("radio", { name: "Stolen" }))
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Report to my admin" })
    )
    expect(within(sheet).getByRole("status")).toHaveTextContent(
      "Reported. Your admin will turn off access on the old phone."
    )
  })

  it("farmers do not see it", async () => {
    fakeServer({})
    renderRoute("/farmer/profile", { as: "farmer" })
    await screen.findAllByText("Log out")
    expect(
      screen.queryByRole("button", { name: /Report a lost or stolen phone/ })
    ).not.toBeInTheDocument()
  })
})
