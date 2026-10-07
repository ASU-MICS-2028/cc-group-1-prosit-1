import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { renderRoute } from "@/test/renderRoute"

describe("router", () => {
  it("renders the home page with its register button", async () => {
    renderRoute("/")
    expect(
      await screen.findByRole("heading", { name: "Fuseini" })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/^Good (morning|afternoon|evening),$/)
    ).toBeInTheDocument()
    for (const link of screen.getAllByRole("link", {
      name: "Register a farmer",
    }))
      expect(link).toHaveAttribute("href", "/register")
  })

  it.each([
    ["/register", "May we save your details?"],
    ["/register/saved", "Saved on this phoneSaved on this computer"],
    ["/farmers", "My farmers"],
    ["/sync", "Sync"],
    ["/visits", "Visits"],
    ["/profile", "Profile"],
    ["/profile/language", "Language"],
    ["/help", "Help"],
    ["/install", "AgroConnect"],
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

  it("offers the work places in the bottom bar and the sidebar", async () => {
    renderRoute("/")
    await screen.findByRole("heading", { name: "Fuseini" })
    // the CSS shows one of the two navigations per screen size; jsdom renders both
    for (const place of ["Home", "Farmers", "Visits", "Market", "Profile"])
      expect(screen.getAllByRole("link", { name: place })).toHaveLength(2)
    // computers only: requests from farmers and money live in the sidebar
    for (const place of ["Requests", "Money"])
      expect(screen.getAllByRole("link", { name: place })).toHaveLength(1)
    expect(screen.getByRole("link", { name: "AgroConnect" })).toHaveAttribute(
      "href",
      "/"
    )
  })

  it("collapses the sidebar and remembers it", async () => {
    renderRoute("/")
    await screen.findByRole("heading", { name: "Fuseini" })
    await userEvent.click(
      screen.getByRole("button", { name: "Close the menu" })
    )
    expect(
      screen.getByRole("button", { name: "Open the menu" })
    ).toBeInTheDocument()
    expect(localStorage.getItem("agroconnect.sidebar")).toBe("closed")
  })

  it("says so when a farmer is not on this device", async () => {
    renderRoute("/farmers/abc-123")
    expect(
      await screen.findByText("This farmer is not on this device.")
    ).toBeInTheDocument()
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
