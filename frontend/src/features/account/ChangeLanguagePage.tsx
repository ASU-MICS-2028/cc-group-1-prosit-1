import { LanguageBanner } from "@/components/LanguageBanner"
import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { BackHeader } from "@/components/Blocks"
import { LanguageOptions } from "@/components/LanguageOptions"
import { Button } from "@/components/ui/button"
import { LANGUAGES, setLanguage, type LanguageCode } from "@/i18n"

/** Change language (Figma "Shared · Change Language"): preview a language, Save to keep it. */
export function Component() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const back = useLocation().pathname.replace(/\/language$/, "")
  const [saved] = useState(
    () => LANGUAGES.find((l) => l.code === i18n.language)?.code ?? "en"
  )
  const [chosen, setChosen] = useState<LanguageCode>(saved)
  const kept = useRef(false)

  // Leaving without Save puts the old language back.
  useEffect(
    () => () => {
      if (!kept.current) void setLanguage(saved, false)
    },
    [saved]
  )

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <BackHeader title={t("profile.languageTitle")} tone="green" to={back} />
      <LanguageBanner />
      <div>
        <h2 className="text-base font-medium text-foreground">
          {t("welcome.question")}
        </h2>
        <p className="text-sm font-medium text-muted-foreground">
          {t("welcome.hint")}
        </p>
      </div>
      <LanguageOptions
        value={chosen}
        onChange={(code) => {
          setChosen(code)
          void setLanguage(code, false) // preview: the screen speaks the new language at once
        }}
      />
      <Button
        size="xl"
        onClick={() => {
          kept.current = true
          void setLanguage(chosen).then(() => navigate(back))
        }}
      >
        {t("profile.save")}
      </Button>
    </div>
  )
}
