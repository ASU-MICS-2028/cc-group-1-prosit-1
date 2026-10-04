import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"

export function Component() {
  const { t } = useTranslation()
  const { id } = useParams()

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">{t("farmers.detailTitle")}</h1>
      <p className="text-sm text-muted-foreground">{id}</p>
    </section>
  )
}
