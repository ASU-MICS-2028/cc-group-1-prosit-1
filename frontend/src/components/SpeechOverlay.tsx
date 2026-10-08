import { Dialog } from "@base-ui/react/dialog"
import { Pause, Play, Volume2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { LANGUAGES } from "@/i18n"
import {
  pauseSpeech,
  resumeSpeech,
  stopSpeech,
  useSpeaking,
  type Speaking,
} from "@/lib/speech"
import { cn } from "@/lib/utils"

/** Bar heights of the waveform in Figma (px). Bars fill green as the reading moves on. */
const WAVE = [
  6, 10, 16, 9, 20, 13, 7, 15, 22, 11, 8, 17, 12, 19, 9, 14, 6, 11, 16, 8, 13,
  18,
]

/** "0:04" */
function clock(ms: number) {
  const seconds = Math.floor(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

/** Reading time so far, ticking once a second while it plays. */
function useElapsed(speaking: Speaking | null) {
  const [now, setNow] = useState(() => Date.now())
  const running = speaking !== null && !speaking.paused
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [running])
  if (!speaking) return 0
  return (
    speaking.elapsedBefore +
    (speaking.since === null ? 0 : Math.max(0, now - speaking.since))
  )
}

/**
 * Overlay · Playing Audio (Figma, Phase 1): while the device reads something aloud (Listen to my
 * details, a farmer's profile, a lesson), a card over a dimmed screen says what is playing, in which
 * language, how far it has got, and lets the person pause. Tapping outside or Escape stops reading.
 * Mounted once for the whole app; it follows speak() in lib/speech.
 */
export function SpeechOverlay() {
  const { t } = useTranslation()
  const speaking = useSpeaking()
  const elapsed = useElapsed(speaking)
  const language =
    LANGUAGES.find((l) => l.code === speaking?.language)?.label ??
    speaking?.language
  const filled = Math.round((speaking?.progress ?? 0) * WAVE.length)

  return (
    <Dialog.Root
      open={speaking !== null}
      onOpenChange={(open) => (open ? null : stopSpeech())}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-[rgb(10_23_15/0.45)]" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-48px)] max-w-[342px] -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-[24px] border bg-card px-3.5 py-3 shadow-[0_10px_14px_rgb(0_0_0/0.25)] outline-none">
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
          >
            <Volume2 className="size-5.5" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <Dialog.Title className="text-[15px] leading-5.5 font-semibold text-foreground">
              {t("speech.playingIn", { language })}
            </Dialog.Title>
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                data-testid="waveform"
                data-filled={filled}
                className="flex items-center gap-0.5 overflow-hidden"
              >
                {WAVE.map((height, i) => (
                  <span
                    key={i}
                    className={cn(
                      "w-0.75 shrink-0 rounded-[1.5px]",
                      i < filled ? "bg-primary" : "bg-[#cfe3d6]"
                    )}
                    style={{ height }}
                  />
                ))}
              </span>
              <span className="text-xs leading-4 font-medium text-muted-foreground tabular-nums">
                {clock(elapsed)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={speaking?.paused ? resumeSpeech : pauseSpeech}
            aria-label={
              speaking?.paused ? t("speech.resume") : t("speech.pause")
            }
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground outline-none hover:brightness-110 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {speaking?.paused ? (
              <Play aria-hidden className="size-4" />
            ) : (
              <Pause aria-hidden className="size-4" />
            )}
          </button>
          <Dialog.Close className="sr-only">{t("speech.stop")}</Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
