import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/PageHeader"

export function Component() {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      <PageHeader title={t("register.title")} />
      <p className="text-muted-foreground">{t("register.placeholder")}</p>
    </div>
  )
}
