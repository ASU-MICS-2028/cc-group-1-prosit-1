import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import i18n from "@/i18n"
import { speak, stopSpeech } from "@/lib/speech"
import { SpeechOverlay } from "./SpeechOverlay"

/** The phone's voice, faked: keeps the last utterance so the test can play its events. */
let utterance: {
  text: string
  onboundary?: (e: { charIndex: number }) => void
  onend?: () => void
}
const voice = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
}

beforeEach(() => {
  vi.stubGlobal("speechSynthesis", voice)
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      text: string
      lang = ""
      rate = 1
      constructor(text: string) {
        this.text = text
        // eslint-disable-next-line @typescript-eslint/no-this-alias -- the test plays this utterance's events
        utterance = this
      }
    }
  )
})
afterEach(() => {
  act(() => stopSpeech())
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe("SpeechOverlay (Overlay · Playing Audio)", () => {
  it("shows what is playing, fills the waveform as it reads, and closes at the end", async () => {
    await i18n.changeLanguage("en")
    render(<SpeechOverlay />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    act(() => {
      speak("Ama Boateng. Tolon, Northern.")
    })
    expect(
      await screen.findByRole("dialog", { name: "Playing in English" })
    ).toBeInTheDocument()
    // The clock starts at 0:00; a slow machine may already show a second or two
    expect(screen.getByText(/^0:0\d$/)).toBeInTheDocument()
    expect(screen.getByTestId("waveform")).toHaveAttribute("data-filled", "0")

    act(() => utterance.onboundary?.({ charIndex: 14 })) // about half the text
    expect(screen.getByTestId("waveform")).toHaveAttribute("data-filled", "11")

    act(() => utterance.onend?.())
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("pauses and plays again, and Escape stops reading", async () => {
    render(<SpeechOverlay />)
    act(() => {
      speak("Ama Boateng")
    })

    await userEvent.click(await screen.findByRole("button", { name: "Pause" }))
    expect(voice.pause).toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Play again" }))
    expect(voice.resume).toHaveBeenCalled()

    voice.cancel.mockClear()
    await userEvent.keyboard("{Escape}")
    expect(voice.cancel).toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("an older reading that ends does not close a newer one", async () => {
    render(<SpeechOverlay />)
    act(() => {
      speak("first")
    })
    const first = utterance
    act(() => {
      speak("second")
    })
    act(() => first.onend?.())
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
  })
})
