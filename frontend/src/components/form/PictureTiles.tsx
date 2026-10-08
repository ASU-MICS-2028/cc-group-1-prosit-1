import { Check } from "lucide-react"
import { useId } from "react"
import { Picture, type PictureSource } from "@/components/Picture"
import { cn } from "@/lib/utils"

interface Tile<T extends string> {
  value: T
  label: string
  /** The Figma photo and the emoji that stands in for it offline */
  picture: PictureSource
}

/**
 * Big picture answers (Figma "Picture Tile"), for people who read slowly: a real picture, a word,
 * and a tick when chosen. Radio buttons or checkboxes underneath, like ChoiceChips.
 *
 * `look="photo"` is the crop card: the photo fills the top 70 %, the name sits underneath (Figma
 * crop tiles). The default shows the cut-out picture in the middle with the word below.
 */
export function PictureTiles<T extends string>({
  labelledBy,
  tiles,
  value,
  onChange,
  multiple = false,
  look = "picture",
}: {
  labelledBy: string
  tiles: readonly Tile<T>[]
  look?: "picture" | "photo"
} & (
  | { multiple?: false; value: T | null; onChange: (value: T) => void }
  | { multiple: true; value: readonly T[]; onChange: (value: T[]) => void }
)) {
  const name = useId()
  const selected = (tile: T) =>
    multiple ? (value as readonly T[]).includes(tile) : value === tile

  function toggle(tile: T) {
    if (multiple) {
      const current = value as readonly T[]
      ;(onChange as (v: T[]) => void)(
        current.includes(tile)
          ? current.filter((v) => v !== tile)
          : [...current, tile]
      )
    } else {
      ;(onChange as (v: T) => void)(tile)
    }
  }

  return (
    <div
      role={multiple ? "group" : "radiogroup"}
      aria-labelledby={labelledBy}
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
    >
      {tiles.map((tile) => {
        const on = selected(tile.value)
        return (
          <label
            key={tile.value}
            className={cn(
              "relative flex cursor-pointer flex-col overflow-hidden rounded-[20px] transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              look === "photo"
                ? "h-36"
                : "h-36 items-center justify-center gap-2 pt-3 pb-3",
              on
                ? "border-2 border-primary bg-secondary"
                : "border bg-card hover:bg-muted"
            )}
          >
            <input
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value={tile.value}
              checked={on}
              onChange={() => toggle(tile.value)}
              className="sr-only"
            />
            {look === "photo" ? (
              <>
                <span
                  aria-hidden
                  className="flex h-[70%] w-full items-center justify-center bg-cream"
                >
                  <Picture
                    source={tile.picture}
                    fit="cover"
                    className="size-full"
                    emojiClassName="size-14"
                  />
                </span>
                <span
                  className={cn(
                    "flex flex-1 items-center justify-center px-2 text-base text-foreground",
                    on ? "font-semibold text-primary" : "font-medium"
                  )}
                >
                  {tile.label}
                </span>
              </>
            ) : (
              <>
                <Picture
                  source={tile.picture}
                  className="size-16"
                  emojiClassName="size-14"
                />
                <span className="px-2 text-center text-base leading-5 font-medium text-foreground">
                  {tile.label}
                </span>
              </>
            )}
            <span
              aria-hidden
              className={cn(
                "absolute top-2 right-2 flex size-7 items-center justify-center rounded-full",
                on
                  ? "bg-primary text-primary-foreground"
                  : look === "photo"
                    ? "border-2 border-white bg-black/15"
                    : "border-2 border-border bg-card"
              )}
            >
              {on ? <Check className="size-4" /> : null}
            </span>
          </label>
        )
      })}
    </div>
  )
}
