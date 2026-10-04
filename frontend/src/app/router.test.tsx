import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { renderRoute } from "@/test/renderRoute"

describe("router", () => {
  it("renders the home page with its two actions", async () => {
    renderRoute("/")
    expect(
      await screen.findByRole("heading", { name: "Welcome to AgroConnect" })
    ).toBeInTheDocument()
    // one link in the page body, one in the bottom nav
    const links = screen.getAllByRole("link", { name: "Register a farmer" })
    expect(links).toHaveLength(2)
    links.forEach((l) => expect(l).toHaveAttribute("href", "/register"))
  })

  it.each([
    ["/register", "Register a farmer"],
    ["/farmers", "Registered farmers"],
    ["/settings", "Settings"],
  ])("renders %s", async (path, heading) => {
    renderRoute(path)
    expect(
      await screen.findByRole("heading", { name: heading })
    ).toBeInTheDocument()
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
