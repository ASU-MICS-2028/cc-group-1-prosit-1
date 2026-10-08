import { Check } from "lucide-react"
import { useId } from "react"
import { useTranslation } from "react-i18next"
import { AudioButton } from "@/components/AudioButton"
import { LANGUAGES, type LanguageCode } from "@/i18n"
import { cn } from "@/lib/utils"

/**
 * The language list from the design: one big row per language with a speaker
 * to hear its name and a tick when chosen. A real radio group underneath, so
 * arrow keys and screen readers work.
 */
export function LanguageOptions({
  value,
  onChange,
}: {
  value: LanguageCode
  onChange: (code: LanguageCode) => void
}) {
  const { t } = useTranslation()
  const name = useId()

  return (
    <div
      role="radiogroup"
      aria-label={t("welcome.groupLabel")}
      className="space-y-3"
    >
      {LANGUAGES.map((language) => {
        const id = `${name}-${language.code}`
        // Not translated yet: shown, but cannot be chosen (like Yorùbá and Kiswahili).
        const later = !language.ready
        return (
          <div
            key={language.code}
            aria-disabled={later || undefined}
            className={cn(
              "group/option relative flex items-center gap-3 rounded-full py-1.5 pr-5 pl-1.5 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              later
                ? "bg-muted text-muted-foreground"
                : "bg-secondary text-foreground has-checked:bg-primary has-checked:text-primary-foreground"
            )}
          >
            <AudioButton
              src={`/audio/${language.code}/language.mp3`}
              label={t("common.listen", { language: language.label })}
              text={language.label}
              className="size-12 bg-card"
            />
            <input
              type="radio"
              id={id}
              name={name}
              value={language.code}
              checked={value === language.code}
              disabled={later}
              onChange={() => onChange(language.code)}
              className="sr-only"
            />
            <label
              htmlFor={id}
              className={cn(
                "flex flex-1 items-center gap-3 self-stretch after:absolute after:inset-0 after:content-['']",
                later ? "cursor-not-allowed" : "cursor-pointer"
              )}
            >
              <span className="flex-1">
                <span className="block text-base leading-6 font-medium">
                  {language.label}
                </span>
                <span className="block text-sm leading-5 font-medium text-muted-foreground group-has-checked/option:text-secondary">
                  {later
                    ? t("country.languageLater", { name: language.sub })
                    : language.sub}
                </span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border-2 border-muted-foreground group-has-checked/option:border-card group-has-checked/option:bg-card",
                  later && "opacity-40"
                )}
              >
                <Check className="size-4 text-primary opacity-0 group-has-checked/option:opacity-100" />
              </span>
            </label>
          </div>
        )
      })}
    </div>
  )
}
