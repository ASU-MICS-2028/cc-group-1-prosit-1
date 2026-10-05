import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import i18n from "@/i18n"
import { renderRoute } from "@/test/renderRoute"

describe("profile language", () => {
  it("shows the current language and switches and remembers a new one", async () => {
    renderRoute("/profile")
    expect(await screen.findByRole("radio", { name: /English/ })).toBeChecked()
    await userEvent.click(screen.getByRole("radio", { name: /Dagbanli/ }))
    await waitFor(() => expect(i18n.language).toBe("dag"))
    expect(localStorage.getItem("agroconnect.lang")).toBe("dag")
  })
})
