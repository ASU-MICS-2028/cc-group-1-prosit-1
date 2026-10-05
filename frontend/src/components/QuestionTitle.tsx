import { AudioButton } from "@/components/AudioButton"
import { promptAudio } from "@/lib/audio"
import { cn } from "@/lib/utils"

/** A screen's question with the speaker button beside it, so it can be heard as well as read. */
export function QuestionTitle({
  title,
  audioKey,
  size = "question",
  className,
}: {
  title: string
  /** The recording to play: /audio/<lang>/<audioKey>.mp3 */
  audioKey: string
  /** "page" = 24 px page title, "question" = 22 px question */
  size?: "page" | "question"
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h1
        className={cn(
          "font-semibold text-foreground",
          size === "page"
            ? "text-2xl leading-9"
            : "text-[22px] leading-8 lg:text-2xl lg:leading-9"
        )}
      >
        {title}
      </h1>
      <AudioButton
        src={promptAudio(audioKey)}
        label={title}
        className={cn("bg-secondary", size === "page" ? "size-11" : "size-12")}
      />
    </div>
  )
}
