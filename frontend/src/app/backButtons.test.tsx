import { screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { fakeServer } from "@/test/fakes"
import { renderRoute } from "@/test/renderRoute"

afterEach(() => vi.unstubAllGlobals())

// A bottom-bar tab is a top-level place: no Back. A page opened from inside one gets Back.
describe("Back buttons", () => {
  it.each([
    ["/farmer/help", "Help"],
    ["/farmer/prices", "Market prices"],
  ])("the farmer tab %s has none", async (path, title) => {
    fakeServer({})
    renderRoute(path, { as: "farmer" })
    expect(
      await screen.findByRole("heading", { name: title })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Back" })
    ).not.toBeInTheDocument()
  })

  it("a farmer service opened from Home has one", async () => {
    fakeServer({})
    renderRoute("/farmer/harvest", { as: "farmer" })
    expect(
      await screen.findByRole("button", { name: "Back" })
    ).toBeInTheDocument()
  })

  it("officer Requests on a phone goes back Home (opened from a Home card)", async () => {
    fakeServer({})
    renderRoute("/requests")
    expect(
      await screen.findByRole("button", { name: "Back" })
    ).toBeInTheDocument()
  })
})
