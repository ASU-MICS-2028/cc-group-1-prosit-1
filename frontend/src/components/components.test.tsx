import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import "@/i18n"
import { FarmerRow } from "@/features/farmers/FarmerRow"
import { AudioButton } from "./AudioButton"
import { LanguageOptions } from "./LanguageOptions"
import { StatusChip, SyncIcon } from "./SyncStatus"

describe("LanguageOptions", () => {
  it("lists the four languages with a speaker each; Dagbani is not translated yet", () => {
    render(<LanguageOptions value="en" onChange={() => {}} />)
    expect(screen.getAllByRole("radio")).toHaveLength(4)
    expect(screen.getByRole("radio", { name: /English/ })).toBeChecked()
    for (const ready of [/English/, /Twi/, /Eʋegbe/])
      expect(screen.getByRole("radio", { name: ready })).toBeEnabled()
    expect(screen.getByRole("radio", { name: /Dagbanli/ })).toBeDisabled()
    expect(
      screen.getByText("Dagbani · coming in a later phase")
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Listen to Dagbanli" })
    ).toBeInTheDocument()
  })

  it("picks Twi or Ewe, but not Dagbani yet", async () => {
    const onChange = vi.fn()
    render(<LanguageOptions value="en" onChange={onChange} />)
    await userEvent.click(screen.getByRole("radio", { name: /Eʋegbe/ }))
    expect(onChange).toHaveBeenCalledWith("ee")
    onChange.mockClear()
    await userEvent.click(screen.getByRole("radio", { name: /Dagbanli/ }))
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe("AudioButton", () => {
  afterEach(() => vi.unstubAllGlobals())

  /** A fake device voice: records what it is asked to read. */
  function fakeVoice() {
    const spoken: string[] = []
    let last: { onend?: () => void } | null = null
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        lang = ""
        rate = 1
        onend?: () => void
        onerror?: () => void
        text: string
        constructor(text: string) {
          this.text = text
        }
      }
    )
    vi.stubGlobal("speechSynthesis", {
      speak: (u: { text: string; onend?: () => void }) => {
        spoken.push(u.text)
        last = u
      },
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
    })
    return { spoken, finish: () => last?.onend?.() }
  }

  it("plays its recording on one tap and stops on the next", async () => {
    const play = vi.fn().mockResolvedValue(undefined)
    const pause = vi.fn()
    const created: string[] = []
    vi.stubGlobal(
      "Audio",
      class {
        constructor(src: string) {
          created.push(src)
        }
        play = play
        pause = pause
      }
    )
    render(<AudioButton src="/audio/tw/language.mp3" label="Listen" />)
    const button = screen.getByRole("button", { name: "Listen" })
    await userEvent.click(button)
    expect(created).toEqual(["/audio/tw/language.mp3"])
    expect(play).toHaveBeenCalledOnce()
    expect(button).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(button)
    expect(pause).toHaveBeenCalledOnce()
    expect(button).toHaveAttribute("aria-pressed", "false")
    // no overlay for speaker buttons
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("reads the text with the device voice when there is no recording", async () => {
    const voice = fakeVoice()
    vi.stubGlobal(
      "Audio",
      class {
        play = () => Promise.reject(new Error("not found"))
        pause = () => {}
      }
    )
    render(
      <AudioButton src="/missing.mp3" label="Listen" text="Which crops?" />
    )
    const button = screen.getByRole("button", { name: "Listen" })
    await userEvent.click(button)
    await vi.waitFor(() => expect(voice.spoken).toEqual(["Which crops?"]))
    act(() => voice.finish())
    expect(button).toHaveAttribute("aria-pressed", "false")
  })

  it("without a recording reads its label", async () => {
    const voice = fakeVoice()
    render(<AudioButton label="Listen" />)
    await userEvent.click(screen.getByRole("button", { name: "Listen" }))
    expect(voice.spoken).toEqual(["Listen"])
  })
})

describe("sync status", () => {
  it("says the state in words, not only colour", () => {
    render(
      <>
        <StatusChip status="waiting" count={3} />
        <StatusChip status="synced" count={1} />
        <StatusChip status="failed" count={0} />
        <SyncIcon status="failed" />
      </>
    )
    expect(screen.getByText("3 waiting")).toBeInTheDocument()
    expect(screen.getByText("1 synced")).toBeInTheDocument()
    expect(screen.getByText("0 to fix")).toBeInTheDocument()
    expect(
      screen.getByRole("img", { name: "Needs fixing" })
    ).toBeInTheDocument()
  })
})

describe("FarmerRow", () => {
  it("shows initials, village, masked phone and links to the farmer", () => {
    render(
      <MemoryRouter>
        <FarmerRow
          farmer={{
            id: "f-1",
            name: "Ama Boateng",
            village: "Tolon",
            phone: "+233240001234",
            status: "waiting",
          }}
        />
      </MemoryRouter>
    )
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/farmers/f-1")
    expect(link).toHaveTextContent("AB")
    expect(link).toHaveTextContent("Tolon · +233 24 ••• 1234")
    expect(
      screen.getByRole("img", { name: "Waiting to sync" })
    ).toBeInTheDocument()
  })
})
