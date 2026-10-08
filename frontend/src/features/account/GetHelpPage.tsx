import { Check, Mic, Phone, Square, Trash2 } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ApiError } from "@/api/client"
import { askForHelp, type HelpCategory } from "@/api/help"
import { AudioButton } from "@/components/AudioButton"
import { BackHeader } from "@/components/Blocks"
import { FieldError } from "@/components/form/FieldError"
import { Picture, type PictureSource } from "@/components/Picture"
import { Button } from "@/components/ui/button"
import { listen } from "@/lib/speech"
import { MAX_SECONDS, toBase64, useRecorder } from "@/lib/useRecorder"
import { cn } from "@/lib/utils"

const HELP_LINE = import.meta.env.VITE_HELP_LINE as string | undefined

const CATEGORIES: { value: HelpCategory; picture: PictureSource }[] = [
  {
    value: "my_details",
    picture: { photo: "", emoji: "identification-card" },
  },
  { value: "money", picture: { photo: "options/cedi", emoji: "money-bag" } },
  {
    value: "crops",
    picture: { photo: "crops/maize.jpg", emoji: "ear-of-corn" },
  },
  { value: "other", picture: { photo: "", emoji: "red-question-mark" } },
]

const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

/**
 * Get help (Figma P4 · 03): what the problem is about, then the question in the farmer's own voice (hold to
 * record, in any language) or typed. It goes to their officer; the next page shows where it stands.
 */
export function Component() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const recorder = useRecorder()
  const [category, setCategory] = useState<HelpCategory | null>(null)
  const [text, setText] = useState("")
  const [tried, setTried] = useState(false)
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const problems = {
    category: category ? null : t("help.ask_.chooseCategory"),
    question:
      recorder.recording || text.trim()
        ? text.length > 1000
          ? t("help.ask_.tooLong")
          : null
        : t("help.ask_.sayIt"),
  }

  async function send() {
    setTried(true)
    if (problems.category || problems.question || !category) return
    setSending(true)
    setFailed(null)
    try {
      const sent = await askForHelp({
        category,
        text: text.trim() || null,
        crop: null,
        problem: null,
        voiceNoteBase64: recorder.recording
          ? await toBase64(recorder.recording.blob)
          : null,
        voiceNoteType: recorder.recording?.type ?? null,
        voiceSeconds: recorder.recording?.seconds ?? null,
      })
      void navigate(`/farmer/help/requests/${sent.id}`, { replace: true })
    } catch (error) {
      setFailed(error instanceof ApiError ? error.message : t("errors.generic"))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <BackHeader
        title={t("help.ask_.title")}
        to="/farmer/help"
        action={
          <AudioButton
            label={t("help.ask_.question")}
            text={`${t("help.ask_.question")} ${t("help.ask_.hold")}`}
            className="size-11 bg-secondary"
          />
        }
      />
      <div className="flex h-40 items-center justify-center rounded-[30px] bg-cream">
        <img
          src="/illustrations/help-community.svg"
          alt=""
          decoding="async"
          className="h-36 w-auto"
        />
      </div>

      <h2
        id="help-category"
        className="text-2xl leading-9 font-semibold text-foreground"
      >
        {t("help.ask_.question")}
      </h2>
      <div
        role="radiogroup"
        aria-labelledby="help-category"
        className="grid grid-cols-2 gap-3"
      >
        {CATEGORIES.map((c) => {
          const on = category === c.value
          return (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setCategory(c.value)}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-[20px] border-2 bg-card p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                on ? "border-primary bg-secondary" : "border-border"
              )}
            >
              {on ? (
                <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check aria-hidden className="size-4" />
                </span>
              ) : null}
              <Picture
                source={c.picture}
                alt=""
                fit="contain"
                className="h-16 w-20"
                emojiClassName="h-16 w-14"
              />
              <span className="text-base font-medium text-foreground">
                {t(`help.category.${c.value}`)}
              </span>
            </button>
          )
        })}
      </div>
      <FieldError
        id="help-category-error"
        message={tried ? (problems.category ?? undefined) : undefined}
      />

      {recorder.recording ? (
        <div className="flex items-center gap-3 rounded-full bg-secondary p-2 pr-3">
          <button
            type="button"
            onClick={() =>
              listen(t("help.voiceQuestion"), recorder.recording!.url)
            }
            aria-label={t("help.ask_.playBack")}
            className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Mic aria-hidden className="size-5" />
          </button>
          <span className="flex-1 text-base font-medium text-primary">
            {t("help.ask_.recorded", {
              length: clock(recorder.recording.seconds),
            })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("help.ask_.delete")}
            onClick={recorder.clear}
            className="size-10 rounded-full text-destructive"
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault()
            recorder.start()
          }}
          onPointerUp={() => recorder.active && recorder.stop()}
          onPointerLeave={() => recorder.active && recorder.stop()}
          onKeyDown={(e) => {
            if (e.key !== " " && e.key !== "Enter") return
            e.preventDefault()
            if (recorder.active) recorder.stop()
            else recorder.start()
          }}
          aria-pressed={recorder.active}
          className={cn(
            "flex items-center gap-4 rounded-full p-2 pr-5 text-left outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50",
            recorder.active
              ? "bg-destructive text-white"
              : "bg-primary text-primary-foreground"
          )}
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-primary">
            {recorder.active ? (
              <Square
                aria-hidden
                className="size-4 fill-current text-destructive"
              />
            ) : (
              <Mic aria-hidden className="size-5" />
            )}
          </span>
          <span>
            <span className="block text-base font-medium">
              {recorder.active
                ? t("help.ask_.recording", {
                    length: clock(recorder.seconds),
                    max: clock(MAX_SECONDS),
                  })
                : t("help.ask_.hold")}
            </span>
            <span className="block text-sm opacity-90">
              {recorder.active
                ? t("help.ask_.letGo")
                : t("help.ask_.anyLanguage")}
            </span>
          </span>
        </button>
      )}
      {recorder.problem ? (
        <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-foreground">
          {t(`help.ask_.mic.${recorder.problem}`)}
        </p>
      ) : null}

      <label
        htmlFor="help-text"
        className="text-base font-medium text-foreground"
      >
        {t("help.ask_.orType")}
      </label>
      <textarea
        id="help-text"
        rows={3}
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-invalid={tried && problems.question ? true : undefined}
        aria-describedby={
          tried && problems.question ? "help-question-error" : undefined
        }
        className="w-full rounded-2xl border-2 border-primary bg-card p-3 text-base text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
      />
      <FieldError
        id="help-question-error"
        message={tried ? (problems.question ?? undefined) : undefined}
      />
      <FieldError id="help-send-error" message={failed ?? undefined} />

      <Button
        size="xl"
        className="w-full"
        disabled={sending || recorder.active}
        onClick={() => void send()}
      >
        {sending ? t("help.ask_.sending") : t("help.ask_.send")}
      </Button>
      {HELP_LINE ? (
        <a
          href={`tel:${HELP_LINE}`}
          className="flex h-14 items-center justify-center gap-2 rounded-full bg-secondary text-base font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Phone aria-hidden className="size-5" />
          {t("help.ask_.callInstead")}
        </a>
      ) : null}
      <p className="text-sm text-muted-foreground">{t("help.ask_.note")}</p>
    </div>
  )
}
