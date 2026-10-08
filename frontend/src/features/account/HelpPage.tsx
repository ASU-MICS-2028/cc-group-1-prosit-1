import {
  ChevronRight,
  GraduationCap,
  MessageSquare,
  Mic,
  Phone,
  Play,
} from "lucide-react"
import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { getMyFarm } from "@/api/farmer"
import { getMyHelpRequests } from "@/api/help"
import { BackHeader } from "@/components/Blocks"
import { useServerData } from "@/features/farmer/useServerData"
import { formatShortDate } from "@/lib/dates"
import { maskPhone } from "@/lib/phone"
import { listen } from "@/lib/speech"
import { cn } from "@/lib/utils"
import { HelpStatusPill } from "./HelpStatusPill"

/** The MoFA help line, set per deployment (VITE_HELP_LINE). Farmers without it call their own officer. */
const HELP_LINE = import.meta.env.VITE_HELP_LINE as string | undefined

const OFFICER_TOPICS = ["register", "noNetwork", "fixRed"] as const
const FARMER_TOPICS = ["myDetails", "noNetwork", "whoToCall"] as const

/**
 * Help (Figma P1 · 24): "How can we help?" as a list. Farmers ask a question in their own voice (Get help),
 * see their questions and answers, open lessons; everyone hears short answers read aloud in the Playing
 * overlay, and can call or SMS for help.
 */
export function Component() {
  const { t } = useTranslation()
  const farmer = useLocation().pathname.startsWith("/farmer")
  const topics = farmer ? FARMER_TOPICS : OFFICER_TOPICS
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* Farmers: Help is a bottom-bar tab, so no Back. Officers open it from Profile. */}
      <BackHeader
        title={t("help.title")}
        to={farmer ? false : "/profile"}
        tone={farmer ? "green" : "default"}
      />
      <div className="flex h-45 items-center justify-center rounded-[30px] bg-cream">
        <img
          src="/illustrations/help-community.svg"
          alt=""
          decoding="async"
          className="h-40 w-auto"
        />
      </div>
      <h2 className="text-2xl leading-9 font-semibold text-foreground">
        {t("help.question")}
      </h2>
      <ul className="space-y-3">
        {farmer ? (
          <>
            <Row
              to="/farmer/help/ask"
              icon={Mic}
              title={t("help.ask")}
              hint={t("help.askHint")}
            />
            <Row
              to="/farmer/lessons"
              icon={GraduationCap}
              title={t("help.lessons")}
              hint={t("help.lessonsHint")}
            />
          </>
        ) : null}
        {topics.map((topic) => (
          <li key={topic}>
            <button
              type="button"
              aria-expanded={open === topic}
              onClick={() => {
                setOpen(open === topic ? null : topic)
                if (open !== topic)
                  listen(
                    `${t(`help.topics.${topic}.title`)}. ${t(`help.topics.${topic}.text`)}`
                  )
              }}
              className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Icon icon={Play} />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-medium text-foreground">
                  {t(`help.topics.${topic}.title`)}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {t("help.oneMinute")}
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className={cn(
                  "size-5 shrink-0 text-muted-foreground transition-transform",
                  open === topic && "rotate-90"
                )}
              />
            </button>
            {open === topic ? (
              <p className="px-4 pt-2 text-sm text-foreground">
                {t(`help.topics.${topic}.text`)}
              </p>
            ) : null}
          </li>
        ))}
        {HELP_LINE ? (
          <>
            <Row
              href={`tel:${HELP_LINE}`}
              icon={Phone}
              title={t("help.call")}
              hint={t("help.callHours")}
            />
            <Row
              href={`sms:${HELP_LINE}`}
              icon={MessageSquare}
              title={t("help.sms")}
              hint={t("help.smsReply")}
            />
          </>
        ) : farmer ? (
          <CallMyOfficer />
        ) : null}
      </ul>

      {farmer ? <MyQuestions /> : null}
    </div>
  )
}

function Icon({ icon: I }: { icon: typeof Play }) {
  return (
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
    >
      <I className="size-5" />
    </span>
  )
}

/** One "How can we help?" row: a link inside the app, or a phone link. */
function Row({
  to,
  href,
  icon,
  title,
  hint,
}: {
  to?: string
  href?: string
  icon: typeof Play
  title: string
  hint: string
}) {
  const inner = (
    <>
      <Icon icon={icon} />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium text-foreground">
          {title}
        </span>
        <span className="block text-sm text-muted-foreground">{hint}</span>
      </span>
      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-muted-foreground"
      />
    </>
  )
  const className =
    "flex items-center gap-3 rounded-xl border bg-card p-3 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
  return (
    <li>
      {to ? (
        <Link to={to} className={className}>
          {inner}
        </Link>
      ) : (
        <a href={href} className={className}>
          {inner}
        </a>
      )}
    </li>
  )
}

/** Farmers without a help line call their own officer. */
function CallMyOfficer() {
  const { t } = useTranslation()
  const officer = useServerData("me", getMyFarm).data?.officer
  if (!officer) return null
  return (
    <Row
      href={`tel:${officer.phoneE164}`}
      icon={Phone}
      title={t("farmerApp.rows.call")}
      hint={`${officer.fullName} · ${maskPhone(officer.phoneE164)}`}
    />
  )
}

/** The farmer's own questions, each opening its status and answer (Figma P4 · 04). */
function MyQuestions() {
  const { t } = useTranslation()
  const questions = useServerData("help-requests", getMyHelpRequests).data
  if (!questions || questions.length === 0) return null
  return (
    <section aria-labelledby="my-questions" className="space-y-3">
      <h2 id="my-questions" className="text-base font-medium text-foreground">
        {t("help.yourQuestions")}
      </h2>
      <ul className="space-y-3">
        {questions.map((q) => (
          <li key={q.id}>
            <Link
              to={`/farmer/help/requests/${q.id}`}
              className="flex items-center gap-3 rounded-xl border bg-card p-3 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-medium text-foreground">
                  {q.text ??
                    (q.problem
                      ? t(`farmerApp.cropCheck.problems.${q.problem}`, {
                          defaultValue: q.problem,
                        })
                      : t("help.voiceQuestion"))}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {t(`help.category.${q.category}`)} ·{" "}
                  {formatShortDate(q.createdAt)}
                </span>
              </span>
              <HelpStatusPill status={q.status} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
