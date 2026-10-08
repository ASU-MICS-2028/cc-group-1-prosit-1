import { CheckCheck, Clock, Minus, Plus } from "lucide-react"
import { useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { BackHeader } from "@/components/Blocks"
import { IllustrationCard } from "@/components/IllustrationCard"
import { Picture, type PictureSource } from "@/components/Picture"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Pieces for the step-by-step screens (money, cooperative, officer requests and loans), so every
// flow looks the same: a header with Back, an optional "Step 2 of 3", cards, and the main button
// pinned to the bottom on phones like the Figma flows (inline under the content on computers).

/**
 * "Coming in a later phase": on every screen of a Phase 2 to 4 feature that runs on stand-in data. People
 * can look around and try the steps, but nothing is saved or sent until its backend exists.
 */
export function SampleBadge() {
  const { t } = useTranslation()
  return (
    <span
      title={t("flow.laterPhaseHint")}
      className="inline-flex h-7 w-fit items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-medium text-muted-foreground"
    >
      <Clock aria-hidden className="size-3.5" />
      {t("flow.laterPhase")}
    </span>
  )
}

/**
 * A button for something not built yet (a voice note, a PDF, a call to a driver): tapping it says
 * "Coming in a later phase" instead of doing nothing.
 */
export function LaterPhaseButton({
  children,
  className,
  variant = "secondary",
}: {
  children: ReactNode
  className?: string
  variant?: "default" | "secondary"
}) {
  const { t } = useTranslation()
  const [told, setTold] = useState(false)
  return (
    <span className="flex flex-col items-stretch gap-1.5">
      <Button
        size="xl"
        variant={variant}
        className={cn(variant === "secondary" && "text-primary", className)}
        onClick={() => setTold(true)}
      >
        {children}
      </Button>
      {told ? (
        <span
          role="status"
          className="text-center text-sm text-muted-foreground"
        >
          {t("flow.laterPhaseTold")}
        </span>
      ) : null}
    </span>
  )
}

/** A link styled as the big button (primary or the light secondary). */
export function ButtonLink({
  to,
  children,
  variant = "default",
  state,
  className,
}: {
  to: string
  children: ReactNode
  variant?: "default" | "secondary"
  state?: unknown
  className?: string
}) {
  return (
    <Link
      to={to}
      state={state}
      className={cn(
        buttonVariants({ size: "xl", variant }),
        "w-full",
        variant === "secondary" && "text-primary",
        className
      )}
    >
      {children}
    </Link>
  )
}

/**
 * One screen of a flow: Back and the title, a step line ("Step 2 of 3 · Which shop?"), the
 * content, and `footer` (the main button). On phones the footer is pinned to the bottom.
 */
export function FlowPage({
  title,
  step,
  back,
  sample = false,
  children,
  footer,
  wide = false,
}: {
  title: string
  step?: string
  /** Where Back goes; without it, the previous screen */
  back?: string
  sample?: boolean
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  return (
    <div
      className={cn(
        "mx-auto flex flex-col gap-5",
        wide ? "max-w-6xl" : "max-w-3xl",
        footer ? "pb-28 md:pb-0" : undefined
      )}
    >
      <BackHeader title={title} to={back} tone="green" />
      {step || sample ? (
        <div className="-mt-2 flex flex-wrap items-center gap-2">
          {step ? (
            <p className="text-sm text-muted-foreground">{step}</p>
          ) : null}
          {sample ? <SampleBadge /> : null}
        </div>
      ) : null}
      {children}
      {footer ? (
        <div className="fixed inset-x-0 bottom-0 z-20 space-y-3 bg-background/95 px-4 pt-3 pb-5 backdrop-blur md:static md:bg-transparent md:p-0 md:backdrop-blur-none">
          {footer}
        </div>
      ) : null}
    </div>
  )
}

/** A white card with a small picture, a title and a line under it; a link when `to` is given. */
export function InfoCard({
  title,
  text,
  picture,
  icon,
  to,
  tone = "card",
  trailing,
}: {
  title: string
  text?: string
  picture?: PictureSource
  icon?: ReactNode
  to?: string
  tone?: "card" | "cream" | "selected"
  trailing?: ReactNode
}) {
  const body = (
    <>
      {picture ? (
        <Picture
          source={picture}
          className="size-12 shrink-0"
          emojiClassName="size-10 shrink-0"
        />
      ) : icon ? (
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-base leading-6 font-medium text-foreground">
          {title}
        </span>
        {text ? (
          <span className="block text-sm text-muted-foreground">{text}</span>
        ) : null}
      </span>
      {trailing}
    </>
  )
  const classes = cn(
    "flex items-center gap-3.5 rounded-[20px] p-4 text-left",
    tone === "cream" && "bg-cream",
    tone === "card" && "border bg-card",
    tone === "selected" && "border-2 border-primary bg-cream",
    to &&
      "outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
  )
  return to ? (
    <Link to={to} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  )
}

/** Label and value rows in a white card ("Loan · GH₵ 800"); the last row can be the total. */
export function TermsCard({
  rows,
  total,
}: {
  rows: [label: string, value: string][]
  total?: [label: string, value: string]
}) {
  return (
    <dl className="space-y-3 rounded-[20px] border bg-card p-4">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="text-right text-sm font-medium text-foreground">
            {value}
          </dd>
        </div>
      ))}
      {total ? (
        <div className="flex items-baseline justify-between gap-4 border-t pt-3">
          <dt className="text-base font-medium text-foreground">{total[0]}</dt>
          <dd className="text-xl font-semibold text-primary">{total[1]}</dd>
        </div>
      ) : null}
    </dl>
  )
}

/** Minus, the count and plus (Figma "Stepper"): bags, kilos; never below `min`. */
export function CountStepper({
  label,
  value,
  onChange,
  unit,
  hint,
  min = 0,
  max = 999,
  compact = false,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  unit?: string
  hint?: string
  min?: number
  max?: number
  compact?: boolean
}) {
  const { t } = useTranslation()
  const button =
    "flex shrink-0 items-center justify-center rounded-full bg-secondary text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40"
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex items-center justify-between",
        compact ? "gap-2" : "h-16 rounded-full border bg-card p-2"
      )}
    >
      <button
        type="button"
        aria-label={t("flow.less", { what: label })}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={cn(button, compact ? "size-9" : "size-12")}
      >
        <Minus aria-hidden className={compact ? "size-4" : "size-5.5"} />
      </button>
      <span
        className={cn(
          "flex flex-col items-center text-center",
          compact ? "w-8" : undefined
        )}
        aria-live="polite"
      >
        <span
          className={cn(
            "font-semibold text-foreground",
            compact ? "text-base" : "text-2xl leading-9"
          )}
        >
          {unit ? `${value} ${unit}` : value}
        </span>
        {hint && !compact ? (
          <span className="text-xs font-medium text-primary">{hint}</span>
        ) : null}
      </span>
      <button
        type="button"
        aria-label={t("flow.more", { what: label })}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={cn(button, compact ? "size-9" : "size-12")}
      >
        <Plus aria-hidden className={compact ? "size-4" : "size-5.5"} />
      </button>
    </div>
  )
}

/**
 * The end of a flow (Figma "Payment Approved" and its cousins): a picture, a badge ("Approved on
 * your phone"), what happened, the receipt rows, and the next actions.
 */
export function Confirmation({
  illustration = "receipt",
  badge,
  title,
  text,
  rows,
  total,
  primary,
  secondary,
  sample = false,
  back,
}: {
  illustration?: string
  badge: string
  title: string
  text: string
  rows: [label: string, value: string][]
  total?: [label: string, value: string]
  primary: { to: string; label: string }
  secondary?: { to: string; label: string }
  sample?: boolean
  /** A Back button to the list this result came from (where there is one) */
  back?: { to: string; label: string }
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-36 md:pb-0">
      {back ? <BackHeader title={back.label} to={back.to} /> : null}
      <IllustrationCard name={illustration} className="h-52 py-3" />
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-secondary px-3 text-sm font-medium text-primary">
          <CheckCheck aria-hidden className="size-4" />
          {badge}
        </span>
        {sample ? <SampleBadge /> : null}
      </div>
      <div className="space-y-1.5">
        <h1 className="text-2xl leading-9 font-semibold text-primary">
          {title}
        </h1>
        <p className="text-base text-foreground">{text}</p>
      </div>
      <TermsCard rows={rows} total={total} />
      <div className="fixed inset-x-0 bottom-0 z-20 space-y-3 bg-background/95 px-4 pt-3 pb-5 backdrop-blur md:static md:mt-2 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <ButtonLink to={primary.to}>{primary.label}</ButtonLink>
        {secondary ? (
          <ButtonLink to={secondary.to} variant="secondary">
            {secondary.label}
          </ButtonLink>
        ) : null}
      </div>
    </div>
  )
}
