import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import i18n, { setLanguage } from "@/i18n"
import { LanguagePicker } from "./LanguagePicker"

describe("LanguagePicker", () => {
  beforeEach(async () => {
    await setLanguage("en")
  })

  it("offers every language written in itself", () => {
    render(<LanguagePicker />)
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "English",
      "Twi",
      "Eʋegbe",
      "Dagbanli",
    ])
  })

  it("changes the app language when a language is picked", async () => {
    render(<LanguagePicker />)
    await userEvent.selectOptions(screen.getByRole("combobox"), "tw")
    await waitFor(() => expect(i18n.language).toBe("tw"))
  })
})
