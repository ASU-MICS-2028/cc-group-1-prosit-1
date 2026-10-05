import { CheckCheck, CircleAlert, Clock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import type { SyncStatus } from "@/lib/syncStatus"

const look = {
  waiting: { icon: Clock, tone: "bg-warning-soft text-warning" },
  synced: { icon: CheckCheck, tone: "bg-secondary text-primary" },
  failed: { icon: CircleAlert, tone: "bg-destructive-soft text-destructive" },
} as const

/** The round icon at the end of a farmer row: clock, double tick or alert. */
export function SyncIcon({
  status,
  className,
}: {
  status: SyncStatus
  className?: string
}) {
  const { t } = useTranslation()
  const { icon: Icon, tone } = look[status]

  return (
    <span
      role="img"
      aria-label={t(`sync.${status}Status`)}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full",
        tone,
        className
      )}
    >
      <Icon aria-hidden className="size-4" />
    </span>
  )
}

/** A pill such as "3 waiting". Colour is never the only signal: the icon and the words say it too. */
export function StatusChip({
  status,
  count,
  className,
}: {
  status: SyncStatus
  count: number
  className?: string
}) {
  const { t } = useTranslation()
  const { icon: Icon, tone } = look[status]

  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium",
        tone,
        className
      )}
    >
      <Icon aria-hidden className="size-4" />
      {t(`sync.${status}`, { count })}
    </span>
  )
}
