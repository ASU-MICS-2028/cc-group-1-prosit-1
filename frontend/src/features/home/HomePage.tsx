import { ChevronRight, MessageSquareText, Wallet } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useSession } from "@/auth/session"
import { OfflineNote, SectionTitle } from "@/components/Blocks"
import { FarmerSearch } from "@/components/FarmerSearch"
import { SyncBadge } from "@/components/SyncBadge"
import { buttonVariants } from "@/components/ui/button"
import { Avatar, FarmerRow } from "@/features/farmers/FarmerRow"
import { loans, requests } from "@/features/sample/data"
import { countByStatus, useDraft, useFarmers } from "@/features/farmers/farmers"
import { STEPS } from "@/features/registration/schema"
import { isToday, partOfDay } from "@/lib/dates"
import { useOnline } from "@/lib/useOnline"
import { cn } from "@/lib/utils"
import { HomeBanner } from "./HomeBanner"

/** The officer's home (Figma 03, 17 no farmers, 18 no network; D04, D05, D06). */
export function Component() {
  const { t } = useTranslation()
  const session = useSession()
  const online = useOnline()
  const farmers = useFarmers()
  const counts = countByStatus(farmers)
  const firstName = session?.user.fullName.split(" ")[0] ?? ""
  const registeredToday = farmers.filter(
    (f) => f.createdAt && isToday(f.createdAt)
  ).length

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm whitespace-nowrap text-muted-foreground">
            {t(`home.greeting.${partOfDay()}`)}
          </p>
          <h1 className="text-2xl leading-9 font-semibold text-primary">
            {firstName}
          </h1>
        </div>
        {/* Figma D04: on computers the search sits next to the badge in the page header */}
        <div className="flex items-center gap-3">
          <FarmerSearch className="hidden h-11 w-72 md:flex lg:w-80" />
          <SyncBadge waiting={counts.waiting} failed={counts.failed} />
        </div>
      </header>

      <FarmerSearch className="md:hidden" />

      {online ? null : <OfflineNote>{t("home.offline")}</OfflineNote>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,740fr)_minmax(0,364fr)]">
        <div className="min-w-0 space-y-6">
          <HomeBanner />
          <MoreWork />
          {farmers.length === 0 ? (
            <>
              <ContinueDraft />
              <NoFarmersYet />
            </>
          ) : (
            <>
              <Today
                className="lg:hidden"
                registered={registeredToday}
                waiting={counts.waiting}
                failed={counts.failed}
              />
              <ContinueDraft className="lg:hidden" />
              <section aria-labelledby="home-recent" className="space-y-3">
                <SectionTitle
                  id="home-recent"
                  link={{ to: "/farmers", label: t("home.viewAll") }}
                >
                  {t("home.recent")}
                </SectionTitle>
                <ul className="space-y-3">
                  {farmers.slice(0, 6).map((farmer, index) => (
                    <li
                      key={farmer.id}
                      className={index >= 3 ? "hidden md:block" : undefined}
                    >
                      <FarmerRow farmer={farmer} />
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
        {farmers.length === 0 ? null : (
          <aside className="hidden space-y-6 lg:block">
            <Today
              registered={registeredToday}
              waiting={counts.waiting}
              failed={counts.failed}
              stacked
            />
            <ContinueDraft />
          </aside>
        )}
      </div>
    </div>
  )
}

/** Today's numbers: three tiles on phones, three rows beside the list on computers. */
function Today({
  registered,
  waiting,
  failed,
  stacked = false,
  className,
}: {
  registered: number
  waiting: number
  failed: number
  stacked?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const tiles = [
    {
      n: registered,
      label: t("home.registered"),
      tone: "bg-secondary text-primary",
      to: "/farmers",
    },
    {
      n: waiting,
      label: stacked ? t("home.waitingToSync") : t("home.waiting"),
      tone: "bg-warning-soft text-warning",
      to: "/sync",
    },
    {
      n: failed,
      label: stacked ? t("home.needFixing") : t("home.toFix"),
      tone: "bg-destructive-soft text-destructive",
      to: "/farmers?status=failed",
    },
  ]

  return (
    <section
      aria-labelledby="home-today"
      className={cn("space-y-3", className)}
    >
      <SectionTitle id="home-today">{t("home.today")}</SectionTitle>
      <ul className={stacked ? "space-y-3" : "grid grid-cols-3 gap-3"}>
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Link
              to={tile.to}
              className={cn(
                "flex rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                stacked
                  ? "h-14 items-center gap-3 px-4"
                  : "flex-col gap-0.5 px-3.5 py-3",
                tile.tone
              )}
            >
              <span className="text-2xl leading-8 font-semibold">{tile.n}</span>
              <span className="text-sm font-medium text-foreground md:text-base">
                {tile.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Figma 03 (phone): requests from farmers and money sit on the home screen, because phones have no
 * sidebar. Computers reach them from the sidebar. Counts are sample data until the backend has them.
 */
function MoreWork() {
  const { t } = useTranslation()
  const cards = [
    {
      to: "/requests",
      icon: MessageSquareText,
      title: t("nav.requests"),
      text: t("home.requestsOpen", {
        count: requests.filter((r) => !r.answered).length,
      }),
      tone: "bg-cream",
    },
    {
      to: "/money",
      icon: Wallet,
      title: t("nav.money"),
      text: t("home.loansToReview", {
        count: loans.filter((l) => l.status === "review").length,
      }),
      tone: "bg-secondary",
    },
  ]
  return (
    <ul className="grid grid-cols-2 gap-3 md:hidden">
      {cards.map(({ to, icon: Icon, title, text, tone }) => (
        <li key={to}>
          <Link
            to={to}
            className={cn(
              "flex h-full flex-col gap-2 rounded-[20px] p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              tone
            )}
          >
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-full bg-card text-primary"
            >
              <Icon className="size-5" />
            </span>
            <span className="text-base font-medium text-foreground">
              {title}
            </span>
            <span className="text-sm text-muted-foreground">{text}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** "Continue where you stopped": the half-filled registration, if there is one. */
function ContinueDraft({ className }: { className?: string }) {
  const { t } = useTranslation()
  const draft = useDraft()
  if (!draft || !draft.data.consentGiven) return null
  const name = draft.data.fullName.trim() || t("home.newFarmer")
  const step = Math.min(draft.step, STEPS.length)

  return (
    <section
      aria-labelledby="home-continue"
      className={cn("space-y-3", className)}
    >
      <SectionTitle id="home-continue">{t("home.continue")}</SectionTitle>
      <Link
        to={`/register?step=${step}`}
        className="flex items-center gap-3 rounded-xl border bg-card p-4 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar name={name} />
        <span className="min-w-0 flex-1 space-y-1.5">
          <span className="block truncate text-base font-medium text-foreground">
            {name}
          </span>
          <span className="block truncate text-sm text-muted-foreground">
            {t("register.stepOf", { step, total: STEPS.length })} ·{" "}
            {t(`register.steps.${STEPS[step - 1].key}`)}
          </span>
          <span
            aria-hidden
            className="block h-1.5 overflow-hidden rounded-full bg-secondary"
          >
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </span>
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-foreground" />
      </Link>
    </section>
  )
}

/** Figma 17 / D05: nothing registered on this device yet. */
function NoFarmersYet() {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col items-center gap-4 rounded-[30px] border bg-card px-5 py-8 text-center">
      <img
        src="/illustrations/empty-farmers.svg"
        alt=""
        decoding="async"
        className="h-30 w-auto"
      />
      <h2 className="text-xl leading-7.5 font-medium text-foreground">
        {t("home.noFarmersTitle")}
      </h2>
      <p className="max-w-xs text-sm text-muted-foreground">
        {t("home.noRecent")}
      </p>
      <Link
        to="/register"
        className={cn(buttonVariants({ size: "xl" }), "w-full max-w-80")}
      >
        {t("home.registerFirst")}
      </Link>
    </section>
  )
}
