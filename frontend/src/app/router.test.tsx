import { screen, waitFor, within } from "@testing-library/react"
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

  it("offers the work places in the bottom bar and the sidebar, Profile in the account menu", async () => {
    renderRoute("/")
    await screen.findByRole("heading", { name: "Fuseini" })
    // the CSS shows one of the two navigations per screen size; jsdom renders both
    for (const place of ["Home", "Farmers", "Visits"])
      expect(screen.getAllByRole("link", { name: place })).toHaveLength(2)
    // phones: Profile in the bottom bar; computers: in the account menu at the top right
    expect(screen.getAllByRole("link", { name: "Profile" })).toHaveLength(1)
    expect(screen.getByRole("link", { name: "AgroConnect" })).toHaveAttribute(
      "href",
      "/"
    )
  })

  it("the account menu opens Profile and asks before logging out", async () => {
    const { router } = renderRoute("/")
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Account menu for Fuseini Alhassan",
      })
    )
    const menu = await screen.findByRole("menu")
    for (const item of [
      "Profile",
      "Language",
      "Help",
      "Install the app",
      "Log out",
    ])
      expect(
        within(menu).getByRole("menuitem", { name: item })
      ).toBeInTheDocument()
    await userEvent.click(
      within(menu).getByRole("menuitem", { name: "Profile" })
    )
    await waitFor(() => expect(router.state.location.pathname).toBe("/profile"))

    await userEvent.click(
      screen.getByRole("button", { name: "Account menu for Fuseini Alhassan" })
    )
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Log out" })
    )
    expect(
      await screen.findByRole("dialog", { name: "Log out?" })
    ).toBeInTheDocument()
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
