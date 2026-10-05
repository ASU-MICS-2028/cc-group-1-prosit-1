import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/PageHeader"

export function Component() {
  const { t } = useTranslation()
  const { id } = useParams()

  return (
    <div className="space-y-3">
      <PageHeader title={t("farmers.detailTitle")} />
      <p className="text-sm text-muted-foreground">{id}</p>
    </div>
  )
}
