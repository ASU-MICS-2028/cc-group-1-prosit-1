import { Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * The round speaker button next to a word or question: plays a short recording
 * so people who cannot read can still use the app (ADR 0014). Without a
 * recording yet (or on a browser that blocks sound) pressing it does nothing.
 */
export function AudioButton({
  src,
  label,
  className,
}: {
  src?: string
  label: string
  className?: string
}) {
  function play() {
    if (!src || typeof Audio === "undefined") return
    new Audio(src).play().catch(() => {
      // missing file or blocked autoplay: stay silent
    })
  }

  return (
    <button
      type="button"
      aria-label={label}
      onClick={play}
      className={cn(
        "relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full bg-background text-primary outline-none transition-transform focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95",
        className
      )}
    >
      <Volume2 aria-hidden className="size-5" />
    </button>
  )
}
