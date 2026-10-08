import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import i18n from "@/i18n"
import { renderRoute } from "@/test/renderRoute"

describe("profile", () => {
  it("shows who is signed in and the language, and opens the language page", async () => {
    const { router } = renderRoute("/profile")
    expect(await screen.findByText("Fuseini Alhassan")).toBeInTheDocument()
    expect(screen.getByText("Extension officer · Savelugu")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("link", { name: /Language/ }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/profile/language")
    )
  })

  it("changes and remembers the language only after Save", async () => {
    const { router } = renderRoute("/profile/language")
    expect(await screen.findByRole("radio", { name: /English/ })).toBeChecked()
    await userEvent.click(screen.getByRole("radio", { name: /Dagbanli/ }))
    await waitFor(() => expect(i18n.language).toBe("dag")) // preview
    expect(localStorage.getItem("agroconnect.lang")).toBe("en")

    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/profile"))
    expect(localStorage.getItem("agroconnect.lang")).toBe("dag")
  })

  it("puts the old language back when leaving without Save", async () => {
    const { router } = renderRoute("/profile/language")
    await userEvent.click(await screen.findByRole("radio", { name: /Twi/ }))
    await waitFor(() => expect(i18n.language).toBe("tw"))
    await userEvent.click(screen.getByRole("button", { name: "Back" }))
    await waitFor(() => expect(router.state.location.pathname).toBe("/profile"))
    await waitFor(() => expect(i18n.language).toBe("en"))
  })

  it("asks before logging out, then signs out", async () => {
    const { router } = renderRoute("/profile")
    await userEvent.click(
      await screen.findByRole("button", { name: "Log out" })
    )
    const sheet = await screen.findByRole("dialog", { name: "Log out?" })
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Stay logged in" })
    )
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    )

    await userEvent.click(screen.getByRole("button", { name: "Log out" }))
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Log out",
      })
    )
    await waitFor(() => expect(router.state.location.pathname).toBe("/who"))
    expect(localStorage.getItem("agroconnect.session")).toBeNull()
  })
})
