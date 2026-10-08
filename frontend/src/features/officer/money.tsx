import {
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  XCircle,
} from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { BackHeader, SectionTitle } from "@/components/Blocks"
import {
  ButtonLink,
  Confirmation,
  InfoCard,
  SampleBadge,
} from "@/components/Flow"
import { ColumnChart } from "@/components/Charts"
import { Picture } from "@/components/Picture"
import {
  cedis,
  cropProblems,
  loans,
  marketPrices,
  moneySummary,
  type LoanApplication,
  type LoanStatus,
} from "@/features/sample/data"
import { useIsDesktop } from "@/lib/useIsDesktop"
import { cn } from "@/lib/utils"

/** P3 · D1 / P3 · 13 Money and farm health for the officer's district. */
export function MoneyHealth() {
  const { t } = useTranslation()
  const s = moneySummary
  const tiles = [
    [cedis(s.paidToDealers), t("officerMoney.paid"), "bg-secondary"],
    [String(s.activeLoans), t("officerMoney.loans"), "bg-secondary"],
    [String(s.insured), t("officerMoney.insured"), "bg-cream"],
    [String(s.problems), t("officerMoney.problems"), "bg-cream"],
  ] as const
  const status = {
    visiting: [t("officerMoney.visiting"), "bg-warning-soft text-warning"],
    confirmed: [t("officerMoney.confirmed"), "bg-secondary text-primary"],
    urgent: [t("officerMoney.urgent"), "bg-destructive-soft text-destructive"],
  } as const

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl leading-9 font-semibold text-primary">
            {t("officerMoney.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {s.district} · {s.month}
          </p>
        </div>
        <SampleBadge />
      </header>
      <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map(([value, label, bg]) => (
          <li key={label} className={cn("space-y-1 rounded-[20px] p-4", bg)}>
            <p className="text-xl font-semibold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </li>
        ))}
      </ul>
      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="weeks"
          className="space-y-3 rounded-[20px] border bg-card p-4"
        >
          <SectionTitle id="weeks">{t("officerMoney.byWeek")}</SectionTitle>
          <ColumnChart
            title={t("officerMoney.byWeek")}
            unit={t("officerMoney.axis")}
            itemHeader={t("officerMoney.weekHeader")}
            items={s.weeks.map((value, i) => ({
              label: t("officerMoney.week", { n: i + 1 }),
              value,
            }))}
            format={cedis}
            short={(v) =>
              v % 1000 === 0 ? `${v / 1000}k` : `${(v / 1000).toFixed(1)}k`
            }
          />
        </section>
        <section
          aria-labelledby="problems"
          className="space-y-3 rounded-[20px] border bg-card p-4"
        >
          <SectionTitle id="problems">
            {t("officerMoney.problemsTitle")}
          </SectionTitle>
          <ul className="space-y-3">
            {cropProblems.map((p) => (
              <li key={p.name} className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-medium text-foreground">
                    {p.name}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {p.where}
                  </span>
                </span>
                <span
                  className={cn(
                    "inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium",
                    status[p.status][1]
                  )}
                >
                  {status[p.status][0]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <InfoCard
        to="/money/loans"
        tone="cream"
        title={t("officerMoney.reviewLoans", {
          count: loans.filter((l) => l.status === "review").length,
        })}
        text={t("officerMoney.reviewHint")}
        trailing={
          <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
        }
      />
    </div>
  )
}

function LoanPill({ status }: { status: LoanStatus }) {
  const { t } = useTranslation()
  const look = {
    review: ["bg-warning-soft text-warning", Clock],
    approved: ["bg-secondary text-primary", CheckCheck],
    declined: ["bg-destructive-soft text-destructive", XCircle],
  } as const
  const [classes, Icon] = look[status]
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium",
        classes
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {t(`officerMoney.status.${status}`)}
    </span>
  )
}

/** P3 · D2 / P3 · 14 / 15 Seed loan applications: the list and one decision. */
export function Loans() {
  const { t } = useTranslation()
  const { id } = useParams()
  const desktop = useIsDesktop()
  const open =
    loans.find((l) => l.id === id) ?? (desktop ? loans[0] : undefined)

  if (!desktop && open) return <LoanDecision loan={open} withBack />

  return (
    <div className="space-y-5">
      <BackHeader
        title={t("officerMoney.loansTitle")}
        to="/money"
        tone="green"
      />
      <div className="-mt-2 flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {t("officerMoney.loansSub", {
            count: loans.filter((l) => l.status === "review").length,
          })}
        </p>
        <SampleBadge />
      </div>
      <div
        className={cn(
          desktop &&
            "grid grid-cols-[minmax(0,698fr)_minmax(0,420fr)] items-start gap-6"
        )}
      >
        <ul className="divide-y overflow-hidden rounded-[20px] border bg-card">
          {loans.map((l) => (
            <li key={l.id}>
              <Link
                to={`/money/loans/${l.id}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                  desktop && open?.id === l.id && "bg-cream"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-medium text-foreground">
                    {l.farmer} · {cedis(l.amount)}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {t("officerMoney.acres", { count: l.acres })}
                  </span>
                </span>
                <LoanPill status={l.status} />
              </Link>
            </li>
          ))}
        </ul>
        {desktop && open ? <LoanDecision loan={open} /> : null}
      </div>
    </div>
  )
}

function LoanDecision({
  loan,
  withBack = false,
}: {
  loan: LoanApplication
  withBack?: boolean
}) {
  const { t } = useTranslation()
  return (
    <section
      aria-labelledby="loan-title"
      className="space-y-4 rounded-[20px] border bg-card p-5"
    >
      {withBack ? (
        <BackHeader
          title={t("officerMoney.loansTitle")}
          to="/money/loans"
          tone="green"
        />
      ) : null}
      <div className="space-y-1">
        <h2 id="loan-title" className="text-xl font-medium text-foreground">
          {t("officerMoney.asks", {
            farmer: loan.farmer,
            amount: cedis(loan.amount),
          })}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("officerMoney.forInputs")}
        </p>
      </div>
      {loan.status === "review" ? (
        <>
          <h3 className="text-base font-medium text-foreground">
            {t("officerMoney.why")}
          </h3>
          <ul className="space-y-2">
            {loan.reasons.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-foreground">
                <CheckCircle2
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-primary"
                />
                {r}
              </li>
            ))}
            {loan.caution ? (
              <li className="flex gap-2 text-sm text-foreground">
                <AlertTriangle
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-warning"
                />
                {loan.caution}
              </li>
            ) : null}
          </ul>
          <p className="rounded-2xl bg-secondary px-4 py-3 text-sm text-primary">
            {t("officerMoney.explainable")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ButtonLink to="/money/loans" variant="secondary">
              {t("officerMoney.decline")}
            </ButtonLink>
            <ButtonLink to={`/money/loans/${loan.id}/approved`}>
              {t("officerMoney.approve", { amount: cedis(loan.amount) })}
            </ButtonLink>
          </div>
        </>
      ) : (
        <LoanPill status={loan.status} />
      )}
    </section>
  )
}

/** P3 · 15b Loan approved. */
export function LoanApproved() {
  const { t } = useTranslation()
  const { id } = useParams()
  const loan = loans.find((l) => l.id === id) ?? loans[0]
  return (
    <Confirmation
      sample
      badge={t("officerMoney.approvedBadge")}
      title={t("officerMoney.approvedTitle", {
        farmer: loan.farmer.split(" ")[0],
      })}
      text={t("officerMoney.approvedText", {
        farmer: loan.farmer.split(" ")[0],
      })}
      rows={[
        [t("officerMoney.farmer"), loan.farmer],
        [t("money.loan.payBack"), "After harvest, by Feb 2027"],
        [t("officerMoney.approvedBy"), t("officerMoney.you")],
      ]}
      total={[t("money.loan.loan"), cedis(loan.amount)]}
      primary={{ to: "/money/loans", label: t("officerMoney.backToLoans") }}
    />
  )
}

/** P2 · 04 / P2 · D1 Market prices for the officer (sample until the price service covers officers). */
export function OfficerMarket() {
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl leading-9 font-semibold text-primary">
            {t("officerMarket.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("officerMarket.subtitle")}
          </p>
        </div>
        <SampleBadge />
      </header>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {marketPrices.map((p) => (
          <li
            key={p.crop}
            className="flex items-center gap-3 rounded-[20px] border bg-card p-3"
          >
            <Picture
              source={p.picture}
              fit="cover"
              className="size-14 rounded-xl"
              emojiClassName="size-12"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium text-foreground">
                {p.crop}
              </span>
              <span className="block text-sm text-muted-foreground">
                {t("officerMarket.line", {
                  tamale: cedis(p.tamale),
                  savelugu: cedis(p.savelugu),
                })}
              </span>
            </span>
            <span className="text-sm font-medium text-primary">
              +{p.change}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
