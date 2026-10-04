import { useTranslation } from "react-i18next"
import { LanguagePicker } from "@/components/LanguagePicker"

export function Component() {
  const { t } = useTranslation()

  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
      <label
        htmlFor="settings-language"
        className="block text-muted-foreground"
      >
        {t("settings.languageHelp")}
      </label>
      <LanguagePicker id="settings-language" />
    </section>
  )
}
