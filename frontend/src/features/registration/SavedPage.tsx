import { AlertTriangle, CheckCheck, Clock, Loader2 } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { buttonVariants } from "@/components/ui/button"
import { useFarmer } from "@/features/farmers/farmers"
import { syncNow } from "@/features/sync/sync"
import { useOnline } from "@/lib/useOnline"
import type { Gender } from "./options"
import { cn } from "@/lib/utils"

interface SavedState {
  id?: string
  name?: string
  gender?: Gender | null
}

type Outcome = "sending" | "sent" | "waiting" | "failed"

/**
 * After saving a farmer. The answer depends on whether the farmer reached the server:
 * - online: the app sends the farmer straight away and says "<name> is registered" once MoFA has it;
 * - offline, or the server could not be reached: Saved (Figma 12 / D15), "Waiting to sync";
 * - refused by the server: "Needs fixing", with the way to fix it.
 * The status is read live from this phone, so a sync that finishes later still updates the page.
 */
export function Component() {
  const { t } = useTranslation()
  const state = (useLocation().state ?? {}) as SavedState
  const online = useOnline()
  const farmer = useFarmer(state.id)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (!online || !state.id) return
    let live = true
    void syncNow()
      .catch(() => {}) // unreachable: the record stays queued and the page says so
      .finally(() => live && setTried(true))
    return () => {
      live = false
    }
  }, [online, state.id])

  const status = farmer?.syncStatus
  const outcome: Outcome =
    status === "synced"
      ? "sent"
      : status === "failed"
        ? "failed"
        : online && state.id && !tried
          ? "sending"
          : "waiting"

  const name = state.name ?? t("register.saved.someone")
  const context =
    state.gender === "female" || state.gender === "male"
      ? state.gender
      : undefined

  if (outcome === "sending")
    return (
      <p
        role="status"
        className="flex items-center justify-center gap-3 py-24 text-base text-muted-foreground"
      >
        <Loader2 aria-hidden className="size-5 animate-spin" />
        {t("register.saved.sending", { name })}
      </p>
    )

  if (outcome === "sent")
    return (
      <Layout
        picture={
          <span className="flex size-40 items-center justify-center rounded-full bg-secondary text-primary md:size-48">
            <CheckCheck aria-hidden className="size-20 md:size-24" />
          </span>
        }
        badge={
          <span className="inline-flex h-8 items-center gap-1.5 self-start rounded-full bg-secondary px-3 text-sm font-medium text-primary">
            <CheckCheck aria-hidden className="size-4" />
            {t("register.saved.sentBadge")}
          </span>
        }
        title={t("register.saved.sentTitle", { name })}
        text={t("register.saved.sentText", { context })}
      />
    )

  if (outcome === "failed")
    return (
      <Layout
        picture={
          <span className="flex size-40 items-center justify-center rounded-full bg-destructive-soft text-destructive md:size-48">
            <AlertTriangle aria-hidden className="size-20 md:size-24" />
          </span>
        }
        badge={
          <span className="inline-flex h-8 items-center gap-1.5 self-start rounded-full bg-destructive-soft px-3 text-sm font-medium text-destructive">
            <AlertTriangle aria-hidden className="size-4" />
            {t("register.saved.failedBadge")}
          </span>
        }
        title={t("register.saved.failedTitle", { name })}
        text={farmer?.syncProblem ?? t("register.saved.failedText")}
        fix={state.id ? `/farmers/${state.id}` : "/farmers?status=failed"}
      />
    )

  return (
    <Layout
      picture={
        <img
          src="/illustrations/saved-waiting.svg"
          alt=""
          decoding="async"
          className="h-full max-h-62.5 w-auto object-contain md:max-h-75"
        />
      }
      badge={
        <span className="inline-flex h-8 items-center gap-1.5 self-start rounded-full bg-warning-soft px-3 text-sm font-medium text-warning">
          <Clock aria-hidden className="size-4" />
          {t("sync.waitingStatus")}
        </span>
      }
      title={
        <>
          <span className="md:hidden">{t("register.saved.titlePhone")}</span>
          <span className="hidden md:inline">
            {t("register.saved.titleComputer")}
          </span>
        </>
      }
      text={t("register.saved.text", { name, context })}
    />
  )
}

/** Phones: the picture on top, no bottom bar. Computers: a wide cream card beside the sidebar. */
function Layout({
  picture,
  badge,
  title,
  text,
  fix,
}: {
  picture: ReactNode
  badge: ReactNode
  title: ReactNode
  text: string
  fix?: string
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-10 md:rounded-[30px] md:bg-cream md:p-10">
      <div className="flex h-62.5 items-center justify-center rounded-[30px] bg-cream md:h-auto md:w-2/5 md:shrink-0 md:bg-transparent">
        {picture}
      </div>
      <div className="flex flex-col gap-4">
        {badge}
        <h1 className="text-2xl leading-9 font-semibold text-foreground md:text-3xl">
          {title}
        </h1>
        <p className="text-base leading-6.5 text-foreground">{text}</p>
        <div className="mt-2 flex flex-col gap-3 md:flex-row">
          {fix ? (
            <Link
              to={fix}
              className={cn(buttonVariants({ size: "xl" }), "md:px-8")}
            >
              {t("register.saved.fix")}
            </Link>
          ) : (
            <Link
              to="/register"
              className={cn(buttonVariants({ size: "xl" }), "md:px-8")}
            >
              {t("register.saved.another")}
            </Link>
          )}
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
