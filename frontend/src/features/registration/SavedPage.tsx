import { Clock } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { buttonVariants } from "@/components/ui/button"
import type { Gender } from "./options"
import { cn } from "@/lib/utils"

interface SavedState {
  name?: string
  gender?: Gender | null
}

/**
 * Saved (Figma 12 / D15): the farmer is on this phone and waiting to sync. Phones show a picture
 * on top and no bottom bar; computers a wide cream card beside the sidebar.
 */
export function Component() {
  const { t } = useTranslation()
  const state = (useLocation().state ?? {}) as SavedState
  const name = state.name ?? t("register.saved.someone")
  const context =
    state.gender === "female" || state.gender === "male"
      ? state.gender
      : undefined

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10 md:rounded-[30px] md:bg-cream md:p-10">
      <div className="flex h-62.5 items-center justify-center rounded-[30px] bg-cream md:h-auto md:w-2/5 md:shrink-0 md:bg-transparent">
        <img
          src="/illustrations/saved-waiting.svg"
          alt=""
          decoding="async"
          className="h-full max-h-62.5 w-auto object-contain md:max-h-75"
        />
      </div>
      <div className="flex flex-col gap-4">
        <span className="inline-flex h-8 items-center gap-1.5 self-start rounded-full bg-warning-soft px-3 text-sm font-medium text-warning">
          <Clock aria-hidden className="size-4" />
          {t("sync.waitingStatus")}
        </span>
        <h1 className="text-2xl leading-9 font-semibold text-foreground md:text-3xl">
          <span className="md:hidden">{t("register.saved.titlePhone")}</span>
          <span className="hidden md:inline">
            {t("register.saved.titleComputer")}
          </span>
        </h1>
        <p className="text-base leading-6.5 text-foreground">
          {t("register.saved.text", { name, context })}
        </p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row">
          <Link
            to="/register"
            className={cn(buttonVariants({ size: "xl" }), "md:px-8")}
          >
            {t("register.saved.another")}
          </Link>
          <Link
            to="/"
            className={cn(
              buttonVariants({ size: "xl", variant: "secondary" }),
              "text-primary md:px-8"
            )}
          >
            {t("register.saved.home")}
          </Link>
        </div>
      </div>
    </div>
  )
}
