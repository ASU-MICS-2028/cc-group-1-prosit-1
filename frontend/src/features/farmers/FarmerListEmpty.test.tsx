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

  it("home says there is nothing recent", async () => {
    renderRoute("/")
    expect(
      await screen.findByText("No farmers registered on this phone yet.")
    ).toBeInTheDocument()
  })

  it("sync says everything is done", async () => {
    renderRoute("/sync")
    expect(
      await screen.findByText("Everything on this phone is saved and synced.")
    ).toBeInTheDocument()
  })
})
