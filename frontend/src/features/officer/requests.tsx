import {
  CalendarPlus,
  CheckCheck,
  Clock,
  FileText,
  MessageSquareText,
  Send,
  ShoppingCart,
} from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { BackHeader } from "@/components/Blocks"
import { ButtonLink, SampleBadge } from "@/components/Flow"
import { Picture } from "@/components/Picture"
import { Button } from "@/components/ui/button"
import { requests, type FarmerRequest } from "@/features/sample/data"
import { useIsDesktop } from "@/lib/useIsDesktop"
import { cn } from "@/lib/utils"

const kindIcon = {
  crop: MessageSquareText,
  loan: FileText,
  order: ShoppingCart,
} as const

/**
 * P3 · 10 / 11 and P3 · D3 Requests from farmers: farmers' problems go to their own officer, who
 * answers here (ADR 0024 "who gives advice"). Phones: the list, then one request per screen.
 * Computers: the list on the left and the open request on the right.
 */
export function Requests() {
  const { t } = useTranslation()
  const { id } = useParams()
  const desktop = useIsDesktop()
  const [answered, setAnswered] = useState<Record<string, boolean>>({})
  const open =
    requests.find((r) => r.id === id) ?? (desktop ? requests[0] : undefined)
  const isDone = (r: FarmerRequest) => r.answered || answered[r.id] === true
  const waiting = requests.filter((r) => !isDone(r)).length

  if (!desktop && open) {
    return (
      <RequestDetail
        request={open}
        done={isDone(open)}
        onAnswer={() => setAnswered((a) => ({ ...a, [open.id]: true }))}
        withBack
      />
    )
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl leading-9 font-semibold text-primary">
            {t("requests.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("requests.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SampleBadge />
          <span className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground">
            {t("requests.open", { count: waiting })}
          </span>
        </div>
      </header>
      <div
        className={cn(
          desktop &&
            "grid grid-cols-[minmax(0,640fr)_minmax(0,464fr)] items-start gap-6"
        )}
      >
        <ul className="divide-y overflow-hidden rounded-[20px] border bg-card">
          {requests.map((r) => {
            const Icon = kindIcon[r.kind]
            const done = isDone(r)
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
                    <span className="block text-base font-medium text-foreground">
                      {r.title}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {r.farmer} · {r.place} · {r.via} · {r.when}
                    </span>
                  </span>
                  <StatusPill done={done} />
                </Link>
              </li>
            )
          })}
        </ul>
        {desktop && open ? (
          <RequestDetail
            request={open}
            done={isDone(open)}
            onAnswer={() => setAnswered((a) => ({ ...a, [open.id]: true }))}
          />
        ) : null}
      </div>
    </div>
  )
}

function StatusPill({ done }: { done: boolean }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium",
        done ? "bg-secondary text-primary" : "bg-warning-soft text-warning"
      )}
    >
      {done ? (
        <CheckCheck aria-hidden className="size-3.5" />
      ) : (
        <Clock aria-hidden className="size-3.5" />
      )}
      {t(done ? "requests.answered" : "requests.new")}
    </span>
  )
}

/** One request: who, what they sent, the app's guess and the officer's advice. */
function RequestDetail({
  request,
  done,
  onAnswer,
  withBack = false,
}: {
  request: FarmerRequest
  done: boolean
  onAnswer: () => void
  withBack?: boolean
}) {
  const { t } = useTranslation()
  const [advice, setAdvice] = useState(request.advice ?? "")

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
          {request.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {request.farmer} · {request.place} · {request.via} · {request.when}
        </p>
      </div>
      {request.picture ? (
        <Picture
          source={request.picture}
          fit="cover"
          className="h-44 w-full rounded-2xl bg-cream"
          emojiClassName="mx-auto h-44 w-24"
        />
      ) : null}
      {request.kind === "crop" ? (
        <>
          {request.guess ? (
            <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-foreground">
              {t("requests.guess", { guess: request.guess })}
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
            disabled={done}
            className="w-full rounded-2xl border-2 border-primary bg-card p-3 text-base text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:border-border disabled:bg-muted"
          />
          {done ? (
            <p
              role="status"
              className="flex items-center gap-2 text-sm font-medium text-primary"
            >
              <CheckCheck aria-hidden className="size-4" />
              {t("requests.sent", { farmer: request.farmer })}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <ButtonLink to="/visits" variant="secondary">
              <CalendarPlus aria-hidden />
              {t("requests.addVisit")}
            </ButtonLink>
            <Button
              size="xl"
              className="w-full"
              disabled={done || advice.trim() === ""}
              onClick={onAnswer}
            >
              <Send aria-hidden />
              {t("requests.sendAdvice")}
            </Button>
          </div>
        </>
      ) : request.kind === "loan" ? (
        <>
          <p className="text-base text-foreground">
            {t("requests.loanText", { farmer: request.farmer })}
          </p>
          <ButtonLink to="/money/loans">{t("requests.openLoans")}</ButtonLink>
        </>
      ) : (
        <>
          <p className="text-base text-foreground">{t("requests.orderText")}</p>
          {done ? (
            <p
              role="status"
              className="flex items-center gap-2 text-sm font-medium text-primary"
            >
              <CheckCheck aria-hidden className="size-4" />
              {t("requests.orderApproved")}
            </p>
          ) : (
            <Button size="xl" className="w-full" onClick={onAnswer}>
              {t("requests.approveOrder")}
            </Button>
          )}
        </>
      )}
    </section>
  )
}
