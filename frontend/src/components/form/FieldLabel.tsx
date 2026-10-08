import type { ReactNode } from "react"
import { AudioButton } from "@/components/AudioButton"
import { promptAudio } from "@/lib/audio"
import { cn } from "@/lib/utils"

/** A question's label with the round speaker beside it (Figma "Field Label"). */
export function FieldLabel({
  id,
  htmlFor,
  audioKey,
  children,
  className,
}: {
  /** id for aria-labelledby (groups of chips or tiles) */
  id?: string
  /** the input it labels (text fields) */
  htmlFor?: string
  audioKey: string
  children: ReactNode
  className?: string
}) {
  const text = (
    <span id={id} className="text-base leading-6 font-medium text-foreground">
      {children}
    </span>
  )
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      {htmlFor ? <label htmlFor={htmlFor}>{text}</label> : text}
      <AudioButton
        src={promptAudio(audioKey)}
        label={typeof children === "string" ? children : audioKey}
        className="size-10 bg-secondary [&_svg]:size-5"
      />
    </div>
  )
}
