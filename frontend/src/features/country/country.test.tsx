import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { loadDraft } from "@/features/registration/store"
import { getAreaUnit } from "@/lib/country"
import { fakeServer } from "@/test/fakes"
import { renderRoute } from "@/test/renderRoute"

afterEach(() => vi.unstubAllGlobals())

describe("Country and money", () => {
  it("shows the country, money and data store, and keeps the farm size unit", async () => {
    fakeServer({})
    renderRoute("/profile/country")
    expect(await screen.findByText("Ghana cedi (GH₵)")).toBeInTheDocument()
    expect(screen.getByText(/Ghana data store/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("radio", { name: "Hectares" }))
    expect(getAreaUnit()).toBe("hectares")
    // a new registration starts in that unit
    expect((await loadDraft()).data.farmSizeUnit).toBe("hectares")
  })

  it("is reached from Profile", async () => {
    fakeServer({})
    renderRoute("/profile")
    expect(
      await screen.findByRole("link", { name: /Country and money/ })
    ).toHaveAttribute("href", "/profile/country")
  })
})
