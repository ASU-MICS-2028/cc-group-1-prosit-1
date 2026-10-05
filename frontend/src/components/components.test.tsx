import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import "@/i18n"
import { FarmerRow } from "@/features/farmers/FarmerRow"
import { AudioButton } from "./AudioButton"
import { LanguageOptions } from "./LanguageOptions"
import { StatusChip, SyncIcon } from "./SyncStatus"

describe("LanguageOptions", () => {
  it("lists the four languages with their English names and a speaker each", () => {
    render(<LanguageOptions value="tw" onChange={() => {}} />)
    const radios = screen.getAllByRole("radio")
    expect(radios).toHaveLength(4)
    expect(screen.getByRole("radio", { name: /Twi/ })).toBeChecked()
    expect(screen.getByText("Akan")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Listen to Dagbanli" })
    ).toBeInTheDocument()
  })

  it("reports the language that was picked", async () => {
    const onChange = vi.fn()
    render(<LanguageOptions value="en" onChange={onChange} />)
    await userEvent.click(screen.getByRole("radio", { name: /Eʋegbe/ }))
    expect(onChange).toHaveBeenCalledWith("ee")
  })
})

describe("AudioButton", () => {
  it("plays its recording", async () => {
    const play = vi.fn().mockResolvedValue(undefined)
    const created: string[] = []
    vi.stubGlobal(
      "Audio",
      class {
        constructor(src: string) {
          created.push(src)
        }
        play = play
      }
    )
    render(<AudioButton src="/audio/tw/language.mp3" label="Listen" />)
    await userEvent.click(screen.getByRole("button", { name: "Listen" }))
    expect(created).toEqual(["/audio/tw/language.mp3"])
    expect(play).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it("stays silent when the recording is missing or blocked", async () => {
    vi.stubGlobal(
      "Audio",
      class {
        play = () => Promise.reject(new Error("not found"))
      }
    )
    render(<AudioButton src="/missing.mp3" label="Listen" />)
    await userEvent.click(screen.getByRole("button", { name: "Listen" }))
    vi.unstubAllGlobals()
  })

  it("does nothing without a recording", async () => {
    render(<AudioButton label="Listen" />)
    await userEvent.click(screen.getByRole("button", { name: "Listen" }))
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
    expect(screen.getByText("0 failed")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Sync failed" })).toBeInTheDocument()
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
