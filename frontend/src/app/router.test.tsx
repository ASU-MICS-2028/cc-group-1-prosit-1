import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { renderRoute } from "@/test/renderRoute"

describe("router", () => {
  it("renders the home page with its register button", async () => {
    renderRoute("/")
    expect(
      await screen.findByRole("heading", { name: "AgroConnect" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Register a farmer" })
    ).toHaveAttribute("href", "/register")
  })

  it.each([
    ["/register", "Register a farmer"],
    ["/farmers", "Farmers"],
    ["/sync", "Sync"],
    ["/profile", "Profile"],
    ["/design", "Components"],
  ])("renders %s", async (path, heading) => {
    renderRoute(path)
    expect(
      await screen.findByRole("heading", { level: 1, name: heading })
    ).toBeInTheDocument()
  })

  it("sends a first-time visitor to the welcome screen", async () => {
    const { router } = renderRoute("/", { firstRun: true })
    expect(
      await screen.findByRole("heading", { name: "Farmer support for Ghana" })
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/welcome")
  })

  it("offers the same four places in the bottom bar and the sidebar", async () => {
    renderRoute("/")
    await screen.findByRole("heading", { name: "AgroConnect" })
    for (const place of ["Home", "Farmers", "Sync", "Profile"]) {
      // the CSS shows one of the two navigations per screen size; jsdom renders both
      expect(screen.getAllByRole("link", { name: place })).toHaveLength(2)
    }
  })

  it("shows the farmer id from the URL", async () => {
    renderRoute("/farmers/abc-123")
    expect(await screen.findByText("abc-123")).toBeInTheDocument()
  })

  it("shows a not-found page with a way home", async () => {
    renderRoute("/nope")
    expect(
      await screen.findByRole("heading", { name: "Page not found" })
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go back home" })).toHaveAttribute(
      "href",
      "/"
    )
  })
})
