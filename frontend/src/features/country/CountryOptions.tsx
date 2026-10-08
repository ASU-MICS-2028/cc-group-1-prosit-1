import { Check } from "lucide-react"
import { useTranslation } from "react-i18next"
import { LANGUAGES } from "@/i18n"
import { COUNTRIES, LATER_LANGUAGES, type CountryCode } from "@/lib/country"
import { cn } from "@/lib/utils"
import { Flag } from "./Flag"

/**
 * The three countries as big radio rows (Figma P2 · 01): flag, name, money and languages. Countries that
 * come in a later phase are shown, but cannot be picked yet.
 */
export function CountryOptions({
  value,
  onChange,
}: {
  value: CountryCode
  onChange: (code: CountryCode) => void
}) {
  const { t } = useTranslation()
  const languageName = (code: string) =>
    LANGUAGES.find((l) => l.code === code)?.sub ??
    LATER_LANGUAGES.find((l) => l.code === code)?.sub ??
    code

  return (
    <div
      role="radiogroup"
      aria-label={t("country.question")}
      className="space-y-3"
    >
      {COUNTRIES.map((c) => {
        const on = c.code === value
        return (
          <button
            key={c.code}
            type="button"
            role="radio"
            aria-checked={on}
            aria-disabled={!c.available}
            onClick={() => c.available && onChange(c.code)}
            className={cn(
              "flex w-full items-center gap-4 rounded-[30px] px-4 py-3.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              on
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground",
              !c.available && "cursor-not-allowed"
            )}
          >
            <Flag country={c.code} />
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium">{c.name}</span>
              <span
                className={cn(
                  "block text-sm",
                  on ? "opacity-90" : "text-muted-foreground"
                )}
              >
                {c.unit} ({c.symbol}) ·{" "}
                {c.languages.map(languageName).join(", ")}
              </span>
              {c.available ? null : (
                <span className="mt-1 inline-block rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {t("flow.laterPhase")}
                </span>
              )}
            </span>
            <span
              aria-hidden
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                on
                  ? "border-white bg-white text-primary"
                  : "border-muted-foreground/40"
              )}
            >
              {on ? <Check className="size-4" /> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
