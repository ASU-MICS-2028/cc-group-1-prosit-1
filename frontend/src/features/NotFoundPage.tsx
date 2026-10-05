import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Component() {
  const { t } = useTranslation()

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("notFound.title")}</h1>
      <Link to="/" className={cn(buttonVariants({ size: "lg" }), "h-12")}>
        {t("notFound.back")}
      </Link>
    </section>
  )
}
