import { Check } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { SyncBadge } from "@/components/SyncBadge"
import { buttonVariants } from "@/components/ui/button"
import { countByStatus, useFarmers } from "@/features/farmers/farmers"
import { dayKey, formatTime } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { useVisits } from "./store"

type Range = "today" | "week"

/** Monday of this week, as a day key. */
function startOfWeek(now = new Date()) {
  const d = new Date(now)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return dayKey(d)
}

/**
 * Visits (Figma 26): the visits logged today or this week. Planned visits (Tomorrow, the route) come
 * from the server with the visit planning service; until then visits start from a farmer's page.
 */
export function Component() {
  const { t } = useTranslation()
  const counts = countByStatus(useFarmers())
  const [range, setRange] = useState<Range>("today")
  const today = dayKey()
  const visits = useVisits(range === "today" ? today : startOfWeek(), today)

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3 md:justify-start">
        <h1 className="text-2xl leading-9 font-semibold text-primary">
          {t("visits.title")}
        </h1>
        <SyncBadge
          waiting={counts.waiting}
          failed={counts.failed}
          className="md:hidden"
        />
      </header>

      <div
        role="radiogroup"
        aria-label={t("visits.title")}
        className="flex gap-2"
      >
        {(["today", "week"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={range === value}
            onClick={() => setRange(value)}
            className={cn(
              "h-12 rounded-full px-5 text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              range === value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground"
            )}
          >
            {t(`visits.${value}`)}
          </button>
        ))}
      </div>

      {visits === undefined ? null : visits.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-[30px] border bg-card px-5 py-8 text-center">
          <h2 className="text-xl leading-7.5 font-medium text-foreground">
            {t("visits.noneTitle")}
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t("visits.noneText")}
          </p>
          <Link
            to="/farmers"
            className={cn(buttonVariants({ size: "xl" }), "w-full max-w-80")}
          >
            {t("visits.chooseFarmer")}
          </Link>
        </section>
      ) : (
        <>
          <p className="rounded-xl bg-cream px-4 py-3 text-base font-medium text-foreground">
            {t(
              range === "today" ? "visits.summaryToday" : "visits.summaryWeek",
              { count: visits.length }
            )}
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {visits.map((visit) => (
              <li key={visit.id}>
                <Link
                  to={`/farmers/${visit.farmerId}`}
                  className="block space-y-2 rounded-[20px] border bg-card p-4 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    >
                      <Check className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-medium text-foreground">
                        {visit.farmer?.fullName ?? t("visits.unknownFarmer")}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {visit.farmer?.community}
                      </span>
                    </span>
                  </span>
                  <span className="block text-sm text-foreground">
                    {t("visits.doneAt", {
                      time: formatTime(visit.completedAt ?? visit.createdAt),
                    })}
                    {visit.topics.length > 0
                      ? ` · ${visit.topics.map((topic) => t(`visits.topics.${topic}`)).join(", ")}`
                      : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
