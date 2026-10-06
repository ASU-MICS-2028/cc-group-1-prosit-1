import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/PageHeader"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Component() {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <PageHeader title={t("notFound.title")} />
      <Link to="/" className={cn(buttonVariants({ size: "xl" }))}>
        {t("notFound.back")}
      </Link>
    </div>
  )
}
