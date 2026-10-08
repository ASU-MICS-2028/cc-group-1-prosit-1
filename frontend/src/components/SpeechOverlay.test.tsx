import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import i18n from "@/i18n"
import { listen, speak, stopSpeech } from "@/lib/speech"
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

  it("plays a recording (a lesson, a voice note) in the overlay, and pauses it", async () => {
    const audio = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      ontimeupdate: null as null | (() => void),
      onended: null as null | (() => void),
      currentTime: 0,
      duration: 20,
    }
    vi.stubGlobal(
      "Audio",
      class {
        constructor() {
          return audio
        }
      }
    )
    render(<SpeechOverlay />)
    act(() => void listen("Lesson text", "/audio/en/lessons.maize-spacing.mp3"))
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    expect(audio.play).toHaveBeenCalledOnce()
    expect(voice.speak).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Pause" }))
    expect(audio.pause).toHaveBeenCalled()
    act(() => audio.onended?.())
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("falls back to the device voice when the recording is missing", async () => {
    vi.stubGlobal(
      "Audio",
      class {
        play = () => Promise.reject(new Error("404"))
        pause = () => {}
      }
    )
    render(<SpeechOverlay />)
    act(() => void listen("Lesson text", "/missing.mp3"))
    await vi.waitFor(() => expect(voice.speak).toHaveBeenCalled())
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })
})
