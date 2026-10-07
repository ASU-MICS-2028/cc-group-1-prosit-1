import { Volume2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { IllustrationCard } from "@/components/IllustrationCard"
import { QuestionTitle } from "@/components/QuestionTitle"
import { LANGUAGES } from "@/i18n"
import { promptAudio } from "@/lib/audio"

/** Step 1 (Figma 04 / D07): the farmer agrees before anything about them is saved. */
export function ConsentStep() {
  const { t, i18n } = useTranslation()
  const language =
    LANGUAGES.find((l) => l.code === i18n.language)?.label ?? "English"

  function listen() {
    if (typeof Audio === "undefined") return
    new Audio(promptAudio("register.consent")).play().catch(() => {
      // no recording yet, or sound blocked
    })
  }

  return (
    <>
      <IllustrationCard name="consent" className="h-50 lg:hidden" />
      <QuestionTitle
        title={t("register.consent.title")}
        audioKey="register.consent.title"
      />
      <p className="text-base leading-6.5 text-foreground">
        {t("register.consent.body")}
      </p>
      <button
        type="button"
        onClick={listen}
        className="inline-flex h-11 items-center gap-2 self-start rounded-full bg-secondary px-4 text-base font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98]"
      >
        <Volume2 aria-hidden className="size-5" />
        {t("common.listen", { language })}
      </button>
    </>
  )
}
