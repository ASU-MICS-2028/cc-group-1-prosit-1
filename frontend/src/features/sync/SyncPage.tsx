import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/PageHeader"
import { StatusChip } from "@/components/SyncStatus"
import { countByStatus, useFarmers } from "@/features/farmers/farmers"
import { SYNC_STATUSES } from "@/lib/syncStatus"

export function Component() {
  const { t } = useTranslation()
  const counts = countByStatus(useFarmers())
  const allDone = counts.waiting === 0 && counts.failed === 0

  return (
    <div className="space-y-5">
      <PageHeader title={t("sync.title")} />
      <div className="flex flex-wrap gap-2">
        {SYNC_STATUSES.map((status) => (
          <StatusChip key={status} status={status} count={counts[status]} />
        ))}
      </div>
      <p
        role="status"
        className="rounded-2xl bg-secondary p-4 font-medium text-secondary-foreground"
      >
        {allDone ? t("sync.allDone") : t("sync.explain")}
      </p>
      {allDone ? (
        <p className="text-sm text-muted-foreground">{t("sync.explain")}</p>
      ) : null}
    </div>
  )
}
