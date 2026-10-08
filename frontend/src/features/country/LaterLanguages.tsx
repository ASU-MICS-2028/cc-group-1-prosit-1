import { Volume2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { LATER_LANGUAGES, countryOf } from "@/lib/country"

/** Yorùbá and Kiswahili (Figma P2 · 02): listed for Nigeria and Kenya, not usable until a later phase. */
export function LaterLanguages() {
  const { t } = useTranslation()
  return (
    <ul aria-label={t("country.laterLanguages")} className="space-y-3">
      {LATER_LANGUAGES.map((l) => (
        <li
          key={l.code}
          aria-disabled
          className="flex items-center gap-3 rounded-full bg-muted py-1.5 pr-5 pl-1.5 text-muted-foreground"
        >
          <span
            aria-hidden
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-card/70"
          >
            <Volume2 className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-medium">{l.label}</span>
            <span className="block text-sm">
              {t("country.laterLanguage", {
                country: countryOf(l.country).name,
              })}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}
