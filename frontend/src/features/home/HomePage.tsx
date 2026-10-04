import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function Component() {
  const { t } = useTranslation()

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("home.title")}</h1>
      <p className="text-muted-foreground">{t("home.subtitle")}</p>
      <div className="flex flex-col gap-3">
        <Link
          to="/register"
          className={cn(buttonVariants({ size: "lg" }), "h-12")}
        >
          {t("home.register")}
        </Link>
        <Link
          to="/farmers"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-12"
          )}
        >
          {t("home.farmers")}
        </Link>
      </div>
    </section>
  )
}
