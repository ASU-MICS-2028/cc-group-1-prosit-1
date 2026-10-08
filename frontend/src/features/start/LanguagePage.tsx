import { LanguageBanner } from "@/components/LanguageBanner"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { LanguageOptions } from "@/components/LanguageOptions"
import { ScreenShell } from "@/components/ScreenShell"
import { Button } from "@/components/ui/button"
import { LANGUAGES, setLanguage, type LanguageCode } from "@/i18n"
import { LaterLanguages } from "@/features/country/LaterLanguages"

/** 01 Choose language: listen to each one, preview it, then continue in it. */
export function Component() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<LanguageCode>(
    LANGUAGES.find((l) => l.code === i18n.language)?.code ?? "en"
  )
  const chosen = LANGUAGES.find((l) => l.code === selected)!

  function preview(code: LanguageCode) {
    setSelected(code)
    // Show the page in that language straight away, but only remember it on Continue.
    void setLanguage(code, false)
  }

  async function confirm() {
    await setLanguage(selected)
    void navigate("/who")
  }

  return (
    <ScreenShell
      className="pt-6"
      brand={{ tagline: t("welcome.brand"), illustration: "language-people" }}
      footer={
        <Button size="xl" className="w-full" onClick={() => void confirm()}>
          {t("welcome.continueIn", { language: chosen.label })}
        </Button>
      }
    >
      {/* Phone (Figma 01): name, greeting banner and the question. */}
      <div className="contents md:hidden">
        <p className="text-2xl leading-9 font-semibold text-primary">
          {t("app.name")}
        </p>
        <LanguageBanner />
        <div>
          <h1 className="text-base font-medium text-foreground">
            {t("welcome.question")}
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            {t("welcome.hint")}
          </p>
        </div>
      </div>
      {/* Computer (Figma D01): the greeting is in the brand panel. */}
      <div className="hidden space-y-3.5 md:block">
        <h1 className="text-2xl leading-9 font-semibold text-foreground">
          {t("welcome.desktopTitle")}
        </h1>
        <p className="text-base text-muted-foreground">
          {t("welcome.desktopHint")}
        </p>
      </div>
      <LanguageOptions value={selected} onChange={preview} />
      <LaterLanguages />
    </ScreenShell>
  )
}
