import { useTranslation } from "react-i18next"
import { LANGUAGES, setLanguage, type LanguageCode } from "@/i18n"

export function LanguagePicker({ id }: { id?: string }) {
  const { t, i18n } = useTranslation()

  return (
    <select
      id={id}
      aria-label={t("common.language")}
      value={i18n.language}
      onChange={(e) => void setLanguage(e.target.value as LanguageCode)}
      className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code} disabled={!l.ready}>
          {l.label}
        </option>
      ))}
    </select>
  )
}
