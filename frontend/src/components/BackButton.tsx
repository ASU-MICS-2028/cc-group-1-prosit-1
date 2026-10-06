import { ChevronLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

/** The round green-tint back arrow at the top of every page without a bottom bar. */
export function BackButton({
  to,
  className,
}: {
  /** Where to go; without it, back to the previous screen. */
  to?: string
  className?: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <button
      type="button"
      aria-label={t("common.back")}
      onClick={() => void (to ? navigate(to) : navigate(-1))}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary outline-none transition-transform focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95",
        className
      )}
    >
      <ChevronLeft aria-hidden className="size-5.5" />
    </button>
  )
}
