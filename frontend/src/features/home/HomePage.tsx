import { Plus } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { FieldArt } from "@/components/FieldArt"
import { PageHeader } from "@/components/PageHeader"
import { StatusChip } from "@/components/SyncStatus"
import { buttonVariants } from "@/components/ui/button"
import { FarmerRow } from "@/features/farmers/FarmerRow"
import { countByStatus, useFarmers } from "@/features/farmers/farmers"
import { SYNC_STATUSES } from "@/lib/syncStatus"
import { cn } from "@/lib/utils"

export function Component() {
  const { t } = useTranslation()
  const farmers = useFarmers()
  const counts = countByStatus(farmers)
  const recent = farmers.slice(0, 3)

  return (
    <div className="space-y-6">
      <PageHeader title={t("home.title")} />

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="relative overflow-hidden rounded-3xl">
          <FieldArt className="absolute inset-0 size-full" />
          <div className="relative max-w-sm space-y-3 p-5 md:p-7">
            <h2 className="font-serif text-2xl font-semibold text-primary italic">
              {t("home.bannerTitle")}
            </h2>
            <p className="text-sm text-foreground/80">{t("home.bannerText")}</p>
            <Link to="/register" className={cn(buttonVariants({ size: "xl" }))}>
              <Plus aria-hidden />
              {t("home.register")}
            </Link>
          </div>
        </section>

        <section aria-labelledby="home-status" className="space-y-3">
          <h2 id="home-status" className="font-medium">
            {t("home.status")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {SYNC_STATUSES.map((status) => (
              <StatusChip key={status} status={status} count={counts[status]} />
            ))}
          </div>
        </section>
      </div>

      <section aria-labelledby="home-recent" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="home-recent" className="font-medium">
            {t("home.recent")}
          </h2>
          <Link to="/farmers" className="text-sm text-primary underline">
            {t("home.viewAll")}
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
            {t("home.noRecent")}
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {recent.map((farmer) => (
              <li key={farmer.id}>
                <FarmerRow farmer={farmer} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
