import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { AudioButton } from "@/components/AudioButton"
import { FieldArt } from "@/components/FieldArt"
import { LanguageOptions } from "@/components/LanguageOptions"
import { Button } from "@/components/ui/button"
import { LANGUAGES, setLanguage, type LanguageCode } from "@/i18n"

/** First run: pick a language by listening, before anything else is shown. */
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
    void navigate("/", { replace: true })
  }

  return (
    <main className="min-h-svh bg-background md:grid md:place-items-center md:bg-muted md:p-8">
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-5 bg-background px-5 pt-6 pb-8 md:min-h-0 md:rounded-3xl md:shadow-lg md:ring-1 md:ring-border">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          {t("app.name")}
        </h1>

        <div className="relative h-44 overflow-hidden rounded-3xl">
          <FieldArt withPeople className="absolute inset-0 size-full" />
          <div className="relative p-4">
            <p className="font-serif text-lg text-primary italic">
              {t("welcome.hello")}
            </p>
            <p className="my-1 inline-block bg-primary px-3 py-0.5 font-serif text-lg text-primary-foreground italic [clip-path:polygon(0_0,100%_0,94%_50%,100%_100%,0_100%)]">
              {t("welcome.greeting")}
            </p>
            <p className="font-serif text-lg text-[#b5472f] italic">
              {t("welcome.choose")}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <AudioButton
            src="/audio/welcome/question.mp3"
            label={t("welcome.question")}
            className="bg-secondary"
          />
          <div>
            <h2 className="text-lg leading-tight font-semibold">
              {t("welcome.question")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("welcome.hint")}</p>
          </div>
        </div>

        <LanguageOptions value={selected} onChange={preview} />

        <Button
          size="xl"
          className="mt-auto w-full"
          onClick={() => void confirm()}
        >
          {t("welcome.continueIn", { language: chosen.label })}
        </Button>
      </div>
    </main>
  )
}
