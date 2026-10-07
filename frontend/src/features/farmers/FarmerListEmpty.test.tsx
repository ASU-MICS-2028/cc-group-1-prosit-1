import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { renderRoute } from "@/test/renderRoute"

describe("with no farmers yet", () => {
  it("the list invites you to register the first one", async () => {
    renderRoute("/farmers")
    expect(
      await screen.findByText("No farmers registered on this phone yet.")
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole("link", { name: "Register a farmer" }).at(-1)
    ).toHaveAttribute("href", "/register")
  })

  it("home invites you to register the first farmer", async () => {
    renderRoute("/")
    expect(
      await screen.findByRole("heading", { name: "No farmers yet" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Register your first farmer" })
    ).toHaveAttribute("href", "/register")
    expect(screen.getAllByText("All synced").length).toBeGreaterThan(0)
  })

  it("sync says everything is done", async () => {
    renderRoute("/sync")
    expect(
      await screen.findByRole("heading", { name: "Everything is sent" })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sync now" })).toBeDisabled()
  })
})
