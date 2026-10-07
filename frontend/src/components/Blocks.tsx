import { ChevronLeft, ChevronRight, WifiOff } from "lucide-react"
import type { ComponentType, ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

// Small pieces every officer and farmer screen shares, so sizes and colours are the same
// everywhere (Figma: page title 24, section title 16, rows 16 + 14, cards with 12 px corners).

/** A list's heading with an optional link on the right ("Recent farmers ... View all"). */
export function SectionTitle({
  id,
  children,
  link,
  tone = "default",
  className,
}: {
  id?: string
  children: ReactNode
  link?: { to: string; label: string }
  tone?: "default" | "red"
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2
        id={id}
        className={cn(
          "text-base leading-6 font-medium",
          tone === "red" ? "text-destructive" : "text-foreground"
        )}
      >
        {children}
      </h2>
      {link ? (
        <Link
          to={link.to}
          className="text-base font-medium text-foreground underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {link.label}
        </Link>
      ) : null}
    </div>
  )
}

/** A sub-page header: round back button and title, with room for an action (Figma 14, 15, 24). */
export function BackHeader({
  title,
  subtitle,
  to,
  action,
  tone = "default",
}: {
  title: string
  subtitle?: string
  /** Where Back goes; without it, the previous screen */
  to?: string
  action?: ReactNode
  /** "green" for top-level titles such as Sync */
  tone?: "default" | "green"
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <header className="flex items-center gap-3">
      <button
        type="button"
        aria-label={t("common.back")}
        onClick={() => void (to ? navigate(to) : navigate(-1))}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95"
      >
        <ChevronLeft aria-hidden className="size-5.5" />
      </button>
      <div className="min-w-0 flex-1">
        <h1
          className={cn(
            "truncate",
            tone === "green"
              ? "text-2xl leading-9 font-semibold text-primary"
              : "text-xl leading-7.5 font-medium text-foreground"
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </header>
  )
}

/** A row in a settings or help list (Figma 16, 24): icon in a green circle, two lines, chevron. */
export function ListRow({
  icon: Icon,
  title,
  subtitle,
  to,
  onClick,
  trailing,
  tone = "default",
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  to?: string
  onClick?: () => void
  /** Replaces the chevron, e.g. a switch */
  trailing?: ReactNode
  tone?: "default" | "red"
}) {
  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          tone === "red"
            ? "bg-destructive-soft text-destructive"
            : "bg-secondary text-primary"
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span
          className={cn(
            "block text-base leading-6 font-medium",
            tone === "red" ? "text-destructive" : "text-foreground"
          )}
        >
          {title}
        </span>
        {subtitle ? (
          <span className="block text-sm text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
      {trailing ??
        (to || onClick ? (
          tone === "red" ? null : (
            <ChevronRight
              aria-hidden
              className="size-5 shrink-0 text-muted-foreground"
            />
          )
        ) : null)}
    </>
  )
  const style =
    "flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-3 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50"
  if (to)
    return (
      <Link to={to} className={cn(style, "hover:bg-muted")}>
        {content}
      </Link>
    )
  if (onClick)
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(style, "hover:bg-muted")}
      >
        {content}
      </button>
    )
  return <div className={style}>{content}</div>
}

/** The amber note shown with no network (Figma 13, 18, D06). */
export function OfflineNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="flex items-center gap-3 rounded-xl bg-warning-soft px-3 py-2.5 text-sm font-medium text-warning"
    >
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card"
      >
        <WifiOff className="size-4" />
      </span>
      {children}
    </p>
  )
}

/** A white card with a thin border and 20 px corners (Figma "Card"). */
export function Card({
  children,
  className,
  ...rest
}: {
  children: ReactNode
  className?: string
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("rounded-[20px] border bg-card p-4", className)}
      {...rest}
    >
      {children}
    </section>
  )
}

/** Label and value lines inside a card ("Phone · +233 24 000 0000"). */
export function Facts({
  rows,
}: {
  rows: [label: string, value: string | null | undefined][]
}) {
  const { t } = useTranslation()
  return (
    <dl className="grid grid-cols-[minmax(6.5rem,auto)_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-foreground">
            {value || t("register.review.notGiven")}
          </dd>
        </div>
      ))}
    </dl>
  )
}
