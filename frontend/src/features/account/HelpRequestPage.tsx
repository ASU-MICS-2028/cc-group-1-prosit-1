import { Check, Play } from "lucide-react"
import { useState } from "react"
import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ApiError } from "@/api/client"
import {
  getMyHelpRequests,
  giveHelpFeedback,
  voiceNoteUrl,
  type HelpRequestInfo,
} from "@/api/help"
import { AudioButton } from "@/components/AudioButton"
import { BackHeader } from "@/components/Blocks"
import { FieldError } from "@/components/form/FieldError"
import { Button } from "@/components/ui/button"
import { NoDataYet } from "@/features/farmer/DataStatus"
import { useServerData } from "@/features/farmer/useServerData"
import { formatShortDate, formatTime, isToday } from "@/lib/dates"
import { listen } from "@/lib/speech"
import { cn } from "@/lib/utils"

const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

/**
 * Your question (Figma P4 · 04): what was sent (with the voice note), where it stands (received, with the
 * officer, answered, solved), the officer's answer, and "Yes, this helped" or "I still need help".
 */
export function Component() {
  const { t } = useTranslation()
  const { id } = useParams()
  const state = useServerData("help-requests", getMyHelpRequests)
  const [updated, setUpdated] = useState<HelpRequestInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const request = updated ?? state.data?.find((r) => r.id === id)
  const when = (iso: string) =>
    `${isToday(iso) ? t("sync.today") : formatShortDate(iso)} ${formatTime(iso)}`

  async function feedback(helped: boolean) {
    if (!request) return
    setBusy(true)
    setProblem(null)
    try {
      setUpdated(await giveHelpFeedback(request.id, helped))
    } catch (error) {
      setProblem(
        error instanceof ApiError ? error.message : t("errors.generic")
      )
    } finally {
      setBusy(false)
    }
  }

  async function playVoice() {
    if (!request) return
    const url = await voiceNoteUrl(request.id)
    if (url) listen(t("help.voiceQuestion"), url)
  }

  if (!request)
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5">
        <BackHeader title={t("help.request.title")} to="/farmer/help" />
        <NoDataYet state={state} />
      </div>
    )

  const answered = request.status !== "waiting"
  const steps = [
    {
      label: t("help.request.received"),
      at: when(request.createdAt),
      done: true,
    },
    {
      label: request.officerName
        ? t("help.request.withOfficer", {
            name: request.officerName.split(" ")[0],
          })
        : t("help.request.withHelpDesk"),
      at: when(request.createdAt),
      done: true,
    },
    {
      label: t("help.request.answered"),
      at: request.answeredAt ? when(request.answeredAt) : null,
      done: answered,
    },
    {
      label: t("help.request.solved"),
      at:
        request.status === "solved"
          ? t("help.request.thanks")
          : t("help.request.tellUs"),
      done: request.status === "solved",
    },
  ]

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <BackHeader
        title={t("help.request.title")}
        to="/farmer/help"
        action={
          request.answer ? (
            <AudioButton
              label={t("help.request.listen")}
              text={request.answer}
              className="size-11 bg-secondary"
            />
          ) : undefined
        }
      />

      <section className="space-y-3 rounded-[20px] border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          {t(`help.category.${request.category}`)} ·{" "}
          {t("help.request.sent", { when: when(request.createdAt) })}
        </p>
        {request.text ? (
          <p className="text-base text-foreground">{request.text}</p>
        ) : null}
        {request.problem ? (
          <p className="text-base text-foreground">
            {t(`farmerApp.cropCheck.problems.${request.problem}`, {
              defaultValue: request.problem,
            })}
          </p>
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
            {t("help.request.voice", {
              length: clock(request.voiceSeconds ?? 0),
            })}
          </Button>
        ) : null}
      </section>

      <ol className="rounded-[20px] border bg-card p-4">
        {steps.map((s, i) => {
          const current = !s.done && (i === 0 || steps[i - 1].done)
          return (
            <li key={s.label} className="relative flex gap-3 pb-4 last:pb-0">
              {i < steps.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-7 left-3.5 h-[calc(100%-1.5rem)] w-0.5",
                    s.done ? "bg-primary" : "bg-border"
                  )}
                />
              ) : null}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full",
                  s.done
                    ? "bg-primary text-primary-foreground"
                    : current
                      ? "border-2 border-primary bg-card"
                      : "bg-muted"
                )}
              >
                {s.done ? <Check className="size-4" /> : null}
              </span>
              <span>
                <span
                  className={cn(
                    "block text-base",
                    s.done
                      ? "text-foreground"
                      : current
                        ? "font-medium text-primary"
                        : "text-muted-foreground"
                  )}
                >
                  {s.label}
                  <span className="sr-only">
                    {" "}
                    {s.done ? t("help.request.done") : t("help.request.notYet")}
                  </span>
                </span>
                {s.at ? (
                  <span className="block text-sm text-muted-foreground">
                    {s.at}
                  </span>
                ) : null}
              </span>
            </li>
          )
        })}
      </ol>

      {request.answer ? (
        <section className="space-y-1 rounded-[20px] bg-cream p-4">
          <h2 className="text-sm text-muted-foreground">
            {t("help.request.answer")}
          </h2>
          <p className="text-base text-foreground">{request.answer}</p>
        </section>
      ) : (
        <p className="rounded-[20px] bg-secondary p-4 text-sm text-primary">
          {t("help.request.waitingNote")}
        </p>
      )}

      <FieldError id="feedback-error" message={problem ?? undefined} />
      {request.status === "answered" ? (
        <>
          <Button
            size="xl"
            className="w-full"
            disabled={busy}
            onClick={() => void feedback(true)}
          >
            {t("help.request.helped")}
          </Button>
          <Button
            size="xl"
            variant="secondary"
            className="w-full text-primary"
            disabled={busy}
            onClick={() => void feedback(false)}
          >
            {t("help.request.stillNeed")}
          </Button>
        </>
      ) : request.status === "still_needs_help" ? (
        <p
          role="status"
          className="rounded-[20px] bg-cream p-4 text-sm text-foreground"
        >
          {t("help.request.backWithOfficer")}
        </p>
      ) : request.status === "solved" ? (
        <p
          role="status"
          className="rounded-[20px] bg-secondary p-4 text-sm text-primary"
        >
          {t("help.request.solvedNote")}
        </p>
      ) : null}
    </div>
  )
}
