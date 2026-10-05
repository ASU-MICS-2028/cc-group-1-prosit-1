import { Check } from "lucide-react"
import { useId } from "react"
import { useTranslation } from "react-i18next"
import { AudioButton } from "@/components/AudioButton"
import { LANGUAGES, type LanguageCode } from "@/i18n"

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
        return (
          <div
            key={language.code}
            className="group/option relative flex min-h-16 items-center rounded-full bg-secondary py-2 pr-4 pl-3 text-secondary-foreground transition-colors has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
          >
            <AudioButton
              src={`/audio/${language.code}/language.mp3`}
              label={t("common.listen", { language: language.label })}
            />
            <input
              type="radio"
              id={id}
              name={name}
              value={language.code}
              checked={value === language.code}
              onChange={() => onChange(language.code)}
              className="sr-only"
            />
            <label
              htmlFor={id}
              className="flex flex-1 cursor-pointer items-center gap-3 self-stretch pl-3 after:absolute after:inset-0 after:content-['']"
            >
              <span className="flex-1">
                <span className="block text-base leading-tight font-medium">
                  {language.label}
                </span>
                <span className="block text-sm leading-tight opacity-75">
                  {language.sub}
                </span>
              </span>
              <span
                aria-hidden
                className="flex size-7 items-center justify-center rounded-full border-2 border-current/40 group-has-checked/option:border-primary-foreground group-has-checked/option:bg-primary-foreground"
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
