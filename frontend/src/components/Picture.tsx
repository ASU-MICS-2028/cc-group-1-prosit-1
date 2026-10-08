import { useState } from "react"
import { useOnline } from "@/lib/useOnline"
import { cn } from "@/lib/utils"

/** A picture from public/pictures and the emoji that stands in for it (public/emoji). */
export interface PictureSource {
  /** Path under public/pictures: "crops/maize.jpg", or without an extension for a .webp file ("options/goat") */
  photo: string
  /** File in public/emoji without .svg, e.g. "ear-of-corn" */
  emoji: string
}

/** True when the phone asks to save data (Chrome's "Lite mode", Android data saver). */
function wantsToSaveData() {
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection
  return connection?.saveData === true
}

/**
 * Real pictures when they can load, emojis when they cannot (ADR 0025). Photos are small WebP files
 * fetched on first view and kept by the service worker, so a photo seen once still shows offline.
 * With no network and no saved copy, a failed download, or the phone in data-saver mode, the emoji
 * (bundled with the app, always offline) is shown instead. The emoji is never a broken image.
 */
export function Picture({
  source,
  alt = "",
  className,
  emojiClassName,
  fit = "contain",
}: {
  source: PictureSource
  alt?: string
  /** Size and shape of the picture */
  className?: string
  /** Size of the emoji when it stands in (defaults to the same as the picture) */
  emojiClassName?: string
  /** "cover" fills the box (crop photos), "contain" keeps the whole object (cut-outs) */
  fit?: "cover" | "contain"
}) {
  const online = useOnline()
  const [failed, setFailed] = useState(false)
  const usePhoto = !failed && !wantsToSaveData() && (online || hasTried(source))

  if (!usePhoto) {
    return (
      <img
        src={`/emoji/${source.emoji}.svg`}
        alt={alt}
        data-picture="emoji"
        className={cn("object-contain", emojiClassName ?? className)}
      />
    )
  }
  return (
    <img
      src={`/pictures/${source.photo.includes(".") ? source.photo : `${source.photo}.webp`}`}
      alt={alt}
      loading="lazy"
      decoding="async"
      data-picture="photo"
      onLoad={() => remember(source)}
      onError={() => setFailed(true)}
      className={cn(
        fit === "cover" ? "object-cover" : "object-contain",
        className
      )}
    />
  )
}

// Photos that loaded once in this session: the service worker has them, so offline they still show.
const seen = new Set<string>()
function remember(source: PictureSource) {
  seen.add(source.photo)
}
function hasTried(source: PictureSource) {
  return seen.has(source.photo)
}
