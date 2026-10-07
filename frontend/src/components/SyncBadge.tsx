import { CheckCheck, CircleAlert, Clock } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

/**
 * The small pill at the top of the officer's screens (Figma "Sync Badge"): "3 waiting" in amber,
 * "1 to fix" in red, or "All synced" in green. It opens the Sync page.
 */
export function SyncBadge({
  waiting,
  failed,
  className,
}: {
  waiting: number
  failed: number
  className?: string
}) {
  const { t } = useTranslation()
  const [Icon, tone, label] =
    waiting > 0
      ? [
          Clock,
          "bg-warning-soft text-warning",
          t("sync.waiting", { count: waiting }),
        ]
      : failed > 0
        ? [
            CircleAlert,
            "bg-destructive-soft text-destructive",
            t("sync.failed", { count: failed }),
          ]
        : [CheckCheck, "bg-secondary text-primary", t("sync.allSynced")]

  return (
    <Link
      to="/sync"
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full pr-3.5 pl-2.5 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        tone,
        className
      )}
    >
      <Icon aria-hidden className="size-4.5" />
      {label}
    </Link>
  )
}
