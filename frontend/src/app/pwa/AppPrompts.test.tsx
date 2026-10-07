import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AppPrompts } from "./AppPrompts"
import "@/i18n"

// The service worker only exists in a real build; here we play its part.
const sw = vi.hoisted(() => ({
  needRefresh: false,
  offlineReady: false,
  setNeedRefresh: vi.fn(),
  setOfflineReady: vi.fn(),
  updateServiceWorker: vi.fn(async () => {}),
}))
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    needRefresh: [sw.needRefresh, sw.setNeedRefresh],
    offlineReady: [sw.offlineReady, sw.setOfflineReady],
    updateServiceWorker: sw.updateServiceWorker,
  }),
}))

/** What Chrome sends when the app can be installed. */
function offerInstall(outcome: "accepted" | "dismissed" = "accepted") {
  const event = Object.assign(
    new Event("beforeinstallprompt", { cancelable: true }),
    {
      prompt: vi.fn(async () => {}),
      userChoice: Promise.resolve({ outcome }),
    }
  )
  act(() => {
    window.dispatchEvent(event)
  })
  return event
}

beforeEach(() => {
  sw.needRefresh = false
  sw.offlineReady = false
  vi.clearAllMocks()
})

describe("app prompts", () => {
  it("shows nothing when there is nothing to say", () => {
    const { container } = render(<AppPrompts pathname="/" />)
    expect(container).toBeEmptyDOMElement()
  })

  it("offers a new version and reloads into it on request", async () => {
    sw.needRefresh = true
    render(<AppPrompts pathname="/register" />)
    expect(screen.getByText("A new version is ready")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Reload now" }))
    expect(sw.updateServiceWorker).toHaveBeenCalledWith(true)

    await userEvent.click(screen.getByRole("button", { name: "Later" }))
    expect(sw.setNeedRefresh).toHaveBeenCalledWith(false)
  })

  it("says once that the app now works offline", async () => {
    sw.offlineReady = true
    render(<AppPrompts pathname="/" />)
    await userEvent.click(screen.getByRole("button", { name: "OK" }))
    expect(sw.setOfflineReady).toHaveBeenCalledWith(false)
  })

  it("offers to install, and shows the browser's question on Install", async () => {
    render(<AppPrompts pathname="/" />)
    const event = offerInstall()
    expect(event.defaultPrevented).toBe(true)

    await userEvent.click(screen.getByRole("button", { name: "Install" }))
    expect(event.prompt).toHaveBeenCalled()
    expect(screen.queryByText("Install AgroConnect")).not.toBeInTheDocument()
  })

  it("Not now hides the offer and remembers it for two weeks", async () => {
    const { unmount } = render(<AppPrompts pathname="/" />)
    offerInstall()
    await userEvent.click(screen.getByRole("button", { name: "Not now" }))
    expect(screen.queryByText("Install AgroConnect")).not.toBeInTheDocument()
    unmount()

    render(<AppPrompts pathname="/" />)
    offerInstall()
    expect(screen.queryByText("Install AgroConnect")).not.toBeInTheDocument()
  })

  it("stays quiet while signing in or registering a farmer", () => {
    sw.offlineReady = true
    const { rerender } = render(<AppPrompts pathname="/register" />)
    offerInstall()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()

    rerender(<AppPrompts pathname="/login/officer" />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()

    rerender(<AppPrompts pathname="/register/saved" />)
    expect(
      screen.getByText("AgroConnect now works offline")
    ).toBeInTheDocument()
  })

  it("hides the offer once the app is installed another way", () => {
    render(<AppPrompts pathname="/" />)
    offerInstall()
    expect(screen.getByText("Install AgroConnect")).toBeInTheDocument()
    act(() => {
      window.dispatchEvent(new Event("appinstalled"))
    })
    expect(screen.queryByText("Install AgroConnect")).not.toBeInTheDocument()
  })
})
