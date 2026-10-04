import { useTranslation } from "react-i18next"

export function Component() {
  const { t } = useTranslation()

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">{t("farmers.title")}</h1>
      <p className="text-muted-foreground">{t("farmers.empty")}</p>
    </section>
  )
}
