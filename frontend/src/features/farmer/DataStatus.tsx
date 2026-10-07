import { FlaskConical, LoaderCircle, WifiOff } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { DataSource } from "@/api/farmer"
import { Button } from "@/components/ui/button"
import { formatShortDate, formatTime, isToday } from "@/lib/dates"
import type { ServerData } from "./useServerData"

/** "today 09:02" or "6 Oct 09:02" */
function when(iso: string, today: string) {
  return `${isToday(iso) ? today : formatShortDate(iso)} ${formatTime(iso)}`
}

/** Shown when nothing is on the device yet: loading, or why it failed with a Try again. */
export function NoDataYet({ state }: { state: ServerData<unknown> }) {
  const { t } = useTranslation()
  if (state.loading) {
    return (
      <p
        role="status"
        className="flex items-center gap-2 py-8 text-muted-foreground"
      >
        <LoaderCircle aria-hidden className="size-5 animate-spin" />
        {t("common.loading")}
      </p>
    )
  }
  return (
    <div role="alert" className="space-y-3 rounded-[20px] border bg-card p-5">
      <p className="text-base text-foreground">
        {state.error?.status === 0
          ? t("farmerApp.offlineNothingSaved")
          : t("errors.generic")}
      </p>
      <Button
        size="xl"
        variant="secondary"
        className="text-primary"
        onClick={state.reload}
      >
        {t("farmerApp.tryAgain")}
      </Button>
    </div>
  )
}

/**
 * One line under a title: "Sample data" while a stand-in provider answers (ADR 0031), and, when the
 * server could not be reached, the time of the copy being shown.
 */
export function DataStatus({
  source,
  state,
}: {
  source?: DataSource
  state: ServerData<unknown>
}) {
  const { t } = useTranslation()
  const stale = state.error && state.savedAt

  if (source !== "sample" && !stale) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {source === "sample" ? (
        <span
          title={t("farmerApp.sampleHint")}
          className="inline-flex h-7 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-medium text-muted-foreground"
        >
          <FlaskConical aria-hidden className="size-3.5" />
          {t("farmerApp.sample")}
        </span>
      ) : null}
      {stale ? (
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-warning-soft px-3 text-xs font-medium text-warning">
          <WifiOff aria-hidden className="size-3.5" />
          {t("farmerApp.savedCopy", {
            when: when(state.savedAt!, t("sync.today")),
          })}
        </span>
      ) : null}
    </div>
  )
}
