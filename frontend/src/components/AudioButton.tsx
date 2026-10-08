import { Square, Volume2 } from "lucide-react"
import { useId } from "react"
import { toggleQuiet, useQuietKey } from "@/lib/speech"
import { cn } from "@/lib/utils"

/**
 * The round speaker button next to a word or question, so people who cannot read can still use the
 * app (ADR 0014). One tap plays, the next tap stops; no overlay (that is for long listening, see
 * SpeechOverlay). It plays the recording at `src`, and until one exists the device voice reads `text`.
 */
export function AudioButton({
  src,
  label,
  text,
  className,
}: {
  src?: string
  label: string
  /** What the device voice reads when there is no recording (defaults to the label) */
  text?: string
  className?: string
}) {
  const key = useId()
  const playing = useQuietKey() === key

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={playing}
      onClick={() => toggleQuiet(key, text ?? label, src)}
      className={cn(
        "relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full bg-background text-primary outline-none transition-transform focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95",
        playing && "bg-primary! text-primary-foreground",
        className
      )}
    >
      {playing ? (
        <Square aria-hidden className="size-4 fill-current" />
      ) : (
        <Volume2 aria-hidden className="size-5" />
      )}
    </button>
  )
}
