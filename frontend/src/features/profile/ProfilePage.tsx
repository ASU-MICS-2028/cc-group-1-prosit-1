import { useTranslation } from "react-i18next"
import { LanguageOptions } from "@/components/LanguageOptions"
import { PageHeader } from "@/components/PageHeader"
import { LANGUAGES, setLanguage } from "@/i18n"

export function Component() {
  const { t, i18n } = useTranslation()
  const current = LANGUAGES.find((l) => l.code === i18n.language)?.code ?? "en"

  return (
    <div className="max-w-lg space-y-5">
      <PageHeader title={t("profile.title")} />
      <section aria-labelledby="profile-language" className="space-y-3">
        <h2 id="profile-language" className="font-medium">
          {t("profile.languageTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("profile.languageHelp")}
        </p>
        <LanguageOptions
          value={current}
          onChange={(code) => void setLanguage(code)}
        />
      </section>
    </div>
  )
}
