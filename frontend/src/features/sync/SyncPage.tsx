import { CheckCheck, Clock, LoaderCircle } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ApiError } from "@/api/client"
import { BackHeader, SectionTitle } from "@/components/Blocks"
import { FieldError } from "@/components/form/FieldError"
import { Button } from "@/components/ui/button"
import { FarmerRow } from "@/features/farmers/FarmerRow"
import { countByStatus, useFarmers } from "@/features/farmers/farmers"
import { formatTime, isToday, formatShortDate } from "@/lib/dates"
import { useOnline } from "@/lib/useOnline"
import { syncNow, useLastSync } from "./sync"

/** "today 09:02" or "6 Oct 09:02" */
function when(iso: string, t: (key: "sync.today") => string) {
  return `${isToday(iso) ? t("sync.today") : formatShortDate(iso)} ${formatTime(iso)}`
}

/** Sync (Figma 15 / D18): how many farmers wait to be sent, Sync now, and who needs fixing. */
export function Component() {
  const { t } = useTranslation()
  const online = useOnline()
  const farmers = useFarmers()
  const counts = countByStatus(farmers)
  const lastSync = useLastSync()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const waiting = farmers.filter((f) => f.status === "waiting")
  const failed = farmers.filter((f) => f.status === "failed")
  const allSent = counts.waiting === 0

  async function send() {
    setBusy(true)
    setProblem(null)
    try {
      await syncNow()
    } catch (error) {
      setProblem(
        error instanceof ApiError && error.status === 0
          ? t("sync.noNetwork")
          : t("sync.couldNotSend")
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <BackHeader title={t("sync.title")} to="/" tone="green" />

      <section className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center md:gap-8 md:rounded-[30px] md:bg-cream md:p-6">
        <div className="flex h-43 items-center justify-center rounded-[30px] bg-cream md:h-auto md:bg-transparent">
          <img
            src="/illustrations/all-synced.svg"
            alt=""
            decoding="async"
            className="h-40 w-auto md:h-36"
          />
        </div>
        <div className="space-y-4 rounded-[20px] border bg-card p-4 md:border-0 md:bg-transparent md:p-0">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className={
                "flex size-11 shrink-0 items-center justify-center rounded-full md:hidden " +
                (allSent
                  ? "bg-secondary text-primary"
                  : "bg-warning-soft text-warning")
              }
            >
              {allSent ? (
                <CheckCheck className="size-5" />
              ) : (
                <Clock className="size-5" />
              )}
            </span>
            <div>
              <h2 className="text-xl leading-7.5 font-medium text-foreground md:text-2xl md:font-semibold">
                {allSent
                  ? t("sync.allSentTitle")
                  : t("sync.notSentTitle", { count: counts.waiting })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {lastSync
                  ? t("sync.lastSent", { when: when(lastSync, t) })
                  : t("sync.neverSent")}
                <span className="hidden md:inline">
                  {" "}
                  · {t("sync.automatic")}
                </span>
              </p>
            </div>
          </div>
          <Button
            size="xl"
            onClick={() => void send()}
            disabled={busy || allSent}
            className="w-full md:w-60"
          >
            {busy ? (
              <LoaderCircle aria-hidden className="animate-spin" />
            ) : null}
            {busy ? t("sync.sending") : t("sync.now")}
          </Button>
          <FieldError
            id="sync-error"
            message={problem ?? (online ? undefined : t("sync.noNetwork"))}
          />
          <p className="text-sm text-muted-foreground md:hidden">
            {t("sync.automatic")}
          </p>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {waiting.length > 0 ? (
          <section aria-labelledby="sync-waiting" className="space-y-3">
            <SectionTitle id="sync-waiting">
              {t("sync.waitingToSend")}
            </SectionTitle>
            <ul className="space-y-3">
              {waiting.map((farmer) => (
                <li key={farmer.id}>
                  <FarmerRow
                    farmer={farmer}
                    detail={
                      (farmer.updatedAt ?? farmer.createdAt)
                        ? t("sync.savedAt", {
                            when: when(
                              farmer.updatedAt ?? farmer.createdAt!,
                              t
                            ),
                          })
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {failed.length > 0 ? (
          <section aria-labelledby="sync-fix" className="space-y-3">
            <SectionTitle id="sync-fix" tone="red">
              {t("sync.needsFixing")}
            </SectionTitle>
            <ul className="space-y-3">
              {failed.map((farmer) => (
                <li key={farmer.id}>
                  <FarmerRow farmer={farmer} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
