import { CheckCheck, Clock, MessageSquareReply, RotateCcw } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { HelpStatus } from "@/api/help"
import { cn } from "@/lib/utils"

const look: Record<HelpStatus, [string, typeof Clock]> = {
  waiting: ["bg-warning-soft text-warning", Clock],
  answered: ["bg-secondary text-primary", MessageSquareReply],
  solved: ["bg-secondary text-primary", CheckCheck],
  still_needs_help: ["bg-destructive-soft text-destructive", RotateCcw],
}

/** Where a question stands, in words and colour. */
export function HelpStatusPill({ status }: { status: HelpStatus }) {
  const { t } = useTranslation()
  const [classes, Icon] = look[status]
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium",
        classes
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {t(`help.status.${status}`)}
    </span>
  )
}
