import {
  CalendarPlus,
  CheckCheck,
  Clock,
  FileText,
  MessageSquareText,
  Play,
  RotateCcw,
  Send,
  Sprout,
} from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"
import { ApiError } from "@/api/client"
import {
  answerHelpRequest,
  getOfficerRequests,
  voiceNoteUrl,
  type RequestItem,
} from "@/api/help"
import { BackHeader } from "@/components/Blocks"
import { ButtonLink } from "@/components/Flow"
import { FieldError } from "@/components/form/FieldError"
import { Button } from "@/components/ui/button"
import { NoDataYet } from "@/features/farmer/DataStatus"
import { useServerData } from "@/features/farmer/useServerData"
import { formatShortDate, formatTime, isToday } from "@/lib/dates"
import { useIsDesktop } from "@/lib/useIsDesktop"
import { listen } from "@/lib/speech"
import { cn } from "@/lib/utils"

const kindIcon = {
  crops: Sprout,
  money: FileText,
  my_details: FileText,
  other: MessageSquareText,
} as const

const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

/**
 * P3 · 10 / 11 and P3 · D3 Requests from farmers (HelpService, ADR 0035): questions from the officer's own
 * farmers, open ones first. Phones: the list, then one request per screen. Computers: the list on the left
 * and the open request on the right. The advice is saved and sent to the farmer.
 */
export function Requests() {
  const { t } = useTranslation()
  const { id } = useParams()
  const desktop = useIsDesktop()
  const state = useServerData("officer-requests", getOfficerRequests)
  const [answered, setAnswered] = useState<Record<string, RequestItem>>({})
  const requests = (state.data?.requests ?? []).map((r) => answered[r.id] ?? r)
  const open =
    requests.find((r) => r.id === id) ?? (desktop ? requests[0] : undefined)
  const waiting = requests.filter(
    (r) => r.status === "waiting" || r.status === "still_needs_help"
  ).length
  const onAnswer = (item: RequestItem) =>
    setAnswered((a) => ({ ...a, [item.id]: item }))

  if (!desktop && open) {
    return <RequestDetail request={open} onAnswer={onAnswer} withBack />
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        {/* Phones open Requests from a Home card, so Back goes Home; computers use the sidebar */}
        <div className="min-w-0 flex-1">
          <BackHeader
            title={t("requests.title")}
            subtitle={t("requests.subtitle")}
            to={desktop ? false : "/"}
            tone="green"
          />
        </div>
        {state.data ? (
          <span className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground">
            {t("requests.open", { count: waiting })}
          </span>
        ) : null}
      </header>
      {!state.data ? (
        <NoDataYet state={state} />
      ) : requests.length === 0 ? (
        <p className="rounded-[20px] border border-dashed p-6 text-center text-muted-foreground">
          {t("requests.none")}
        </p>
      ) : (
        <div
          className={cn(
            desktop &&
              "grid grid-cols-[minmax(0,640fr)_minmax(0,464fr)] items-start gap-6"
          )}
        >
          <ul className="divide-y overflow-hidden rounded-[20px] border bg-card">
            {requests.map((r) => {
              const Icon = kindIcon[r.category]
              return (
                <li key={r.id}>
                  <Link
                    to={`/requests/${r.id}`}
                    aria-current={
                      open?.id === r.id && desktop ? "true" : undefined
                    }
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                      open?.id === r.id && desktop && "bg-secondary"
                    )}
                  >
                    <span
                      aria-hidden
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-medium text-foreground">
                        {headline(r, t)}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {[r.farmerName, r.community, when(r.createdAt, t)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <StatusPill item={r} />
                  </Link>
                </li>
              )
            })}
          </ul>
          {desktop && open ? (
            <RequestDetail request={open} onAnswer={onAnswer} />
          ) : null}
        </div>
      )}
    </div>
  )
}

type T = TFunction

function when(iso: string, t: T) {
  return `${isToday(iso) ? t("sync.today") : formatShortDate(iso)} ${formatTime(iso)}`
}

/** The line that names the question: the crop problem, what the farmer typed, or "Voice question". */
function headline(r: RequestItem, t: T) {
  if (r.problem && r.crop)
    return t("requests.cropLine", {
      crop: t(`register.crops.${r.crop}`),
      problem: t(`farmerApp.cropCheck.problems.${r.problem}`, {
        defaultValue: r.problem,
      }),
    })
  return r.text ?? t("requests.voiceOnly")
}

function StatusPill({ item }: { item: RequestItem }) {
  const { t } = useTranslation()
  const [classes, Icon, key]: [
    string,
    typeof Clock,
    "new" | "overdue" | RequestItem["status"],
  ] =
    item.status === "answered" || item.status === "solved"
      ? ["bg-secondary text-primary", CheckCheck, item.status]
      : item.status === "still_needs_help"
        ? ["bg-destructive-soft text-destructive", RotateCcw, item.status]
        : [
            "bg-warning-soft text-warning",
            Clock,
            item.overdue ? "overdue" : "new",
          ]
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium",
        classes
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {t(`requests.status.${key}`)}
    </span>
  )
}

/** One request: who, what they sent (text, voice note, the app's guess), and the officer's advice. */
function RequestDetail({
  request,
  onAnswer,
  withBack = false,
}: {
  request: RequestItem
  onAnswer: (item: RequestItem) => void
  withBack?: boolean
}) {
  const { t } = useTranslation()
  const [advice, setAdvice] = useState(request.answer ?? "")
  const [sending, setSending] = useState(false)
  const [tried, setTried] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const done = request.status === "answered" || request.status === "solved"
  const problem = !advice.trim()
    ? t("requests.adviceRequired")
    : advice.length > 2000
      ? t("requests.adviceTooLong")
      : null

  async function send() {
    setTried(true)
    if (problem) return
    setSending(true)
    setFailed(null)
    try {
      onAnswer(await answerHelpRequest(request.id, advice.trim()))
    } catch (error) {
      setFailed(error instanceof ApiError ? error.message : t("errors.generic"))
    } finally {
      setSending(false)
    }
  }

  async function playVoice() {
    const url = await voiceNoteUrl(request.id)
    if (url) listen(t("requests.voiceOnly"), url)
  }

  return (
    <section
      aria-labelledby="request-title"
      className="space-y-4 rounded-[20px] border bg-card p-5"
    >
      {withBack ? (
        <BackHeader title={t("requests.title")} to="/requests" tone="green" />
      ) : null}
      <div className="space-y-1">
        <h2 id="request-title" className="text-xl font-medium text-foreground">
          {headline(request, t)}
        </h2>
        <p className="text-sm text-muted-foreground">
          {[
            request.farmerName,
            request.community,
            t(`help.category.${request.category}`),
            when(request.createdAt, t),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      {request.text && request.problem ? (
        <p className="text-base text-foreground">{request.text}</p>
      ) : null}
      {request.hasVoiceNote ? (
        <Button
          size="xl"
          variant="secondary"
          className="gap-3 pl-2 text-primary"
          onClick={() => void playVoice()}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Play aria-hidden className="size-5" />
          </span>
          {t("requests.playVoice", {
            name: request.farmerName.split(" ")[0],
            length: clock(request.voiceSeconds ?? 0),
          })}
        </Button>
      ) : null}
      {request.problem ? (
        <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-foreground">
          {t("requests.guess", {
            guess: t(`farmerApp.cropCheck.problems.${request.problem}`, {
              defaultValue: request.problem,
            }),
          })}
        </p>
      ) : null}
      {request.status === "still_needs_help" ? (
        <p className="rounded-2xl bg-destructive-soft px-4 py-3 text-sm text-destructive">
          {t("requests.stillNeeds")}
        </p>
      ) : null}
      <label
        htmlFor="advice"
        className="block text-sm font-medium text-foreground"
      >
        {t("requests.yourAdvice")}
      </label>
      <textarea
        id="advice"
        value={advice}
        onChange={(e) => setAdvice(e.target.value)}
        rows={4}
        maxLength={2000}
        disabled={done}
        aria-invalid={tried && problem ? true : undefined}
        aria-describedby={tried && problem ? "advice-error" : undefined}
        className="w-full rounded-2xl border-2 border-primary bg-card p-3 text-base text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:border-border disabled:bg-muted aria-invalid:border-destructive"
      />
      <FieldError
        id="advice-error"
        message={tried ? (problem ?? undefined) : undefined}
      />
      <FieldError id="advice-send-error" message={failed ?? undefined} />
      {done ? (
        <p
          role="status"
          className="flex items-center gap-2 text-sm font-medium text-primary"
        >
          <CheckCheck aria-hidden className="size-4" />
          {request.status === "solved"
            ? t("requests.solved", { farmer: request.farmerName })
            : t("requests.sent", { farmer: request.farmerName })}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <ButtonLink
          to={`/farmers/${request.farmerId}/visit`}
          variant="secondary"
        >
          <CalendarPlus aria-hidden />
          {t("requests.addVisit")}
        </ButtonLink>
        <Button
          size="xl"
          className="w-full"
          disabled={done || sending}
          onClick={() => void send()}
        >
          <Send aria-hidden />
          {sending ? t("requests.sending") : t("requests.sendAdvice")}
        </Button>
      </div>
    </section>
  )
}
