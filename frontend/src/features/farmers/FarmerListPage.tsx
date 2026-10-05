import { Plus, Search } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/PageHeader"
import { buttonVariants } from "@/components/ui/button"
import { SYNC_STATUSES, type SyncStatus } from "@/lib/syncStatus"
import { cn } from "@/lib/utils"
import { FarmerRow } from "./FarmerRow"
import { countByStatus, filterFarmers, useFarmers } from "./farmers"

export function Component() {
  const { t } = useTranslation()
  const farmers = useFarmers()
  const counts = countByStatus(farmers)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<SyncStatus | "all">("all")
  const visible = filterFarmers(farmers, query, status)

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("farmers.title")}
        action={
          <Link
            to="/register"
            className={cn(
              buttonVariants({ size: "lg" }),
              "hidden rounded-full md:inline-flex md:h-10 md:px-5"
            )}
          >
            <Plus aria-hidden />
            {t("farmers.register")}
          </Link>
        }
      />

      <label className="relative block">
        <span className="sr-only">{t("farmers.search")}</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("farmers.search")}
          className="h-12 w-full rounded-full border bg-background pr-4 pl-12 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>

      <div
        role="group"
        aria-label={t("farmers.filterLabel")}
        className="flex flex-wrap gap-2"
      >
        {(["all", ...SYNC_STATUSES] as const).map((value) => {
          const active = status === value
          const label =
            value === "all"
              ? `${t("farmers.all")} (${farmers.length})`
              : t(`sync.${value}`, { count: counts[value] })
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setStatus(value)}
              className={cn(
                "h-9 rounded-full px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {visible.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {visible.map((farmer) => (
            <li key={farmer.id}>
              <FarmerRow farmer={farmer} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-4 rounded-2xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            {farmers.length === 0 ? t("farmers.empty") : t("farmers.noMatch")}
          </p>
          {farmers.length === 0 ? (
            <Link to="/register" className={cn(buttonVariants({ size: "xl" }))}>
              <Plus aria-hidden />
              {t("farmers.register")}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  )
}
