import { useTranslation } from "react-i18next"

export function Loading() {
  const { t } = useTranslation()
  return <p className="p-4">{t("common.loading")}</p>
}
