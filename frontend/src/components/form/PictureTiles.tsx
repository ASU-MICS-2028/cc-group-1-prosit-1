import { Check } from "lucide-react"
import { useId } from "react"
import { cn } from "@/lib/utils"

interface Tile<T extends string> {
  value: T
  label: string
  /** File in public/icons, without .svg */
  icon: string
}

/**
 * Big picture answers (Figma "Picture Tile"), for people who read slowly: an icon, a word, and a
 * tick when chosen. Radio buttons or checkboxes underneath, like ChoiceChips.
 */
export function PictureTiles<T extends string>({
  labelledBy,
  tiles,
  value,
  onChange,
  multiple = false,
}: {
  labelledBy: string
  tiles: readonly Tile<T>[]
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
              "relative flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] pt-4 pb-3.5 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
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
            <span
              aria-hidden
              className={cn(
                "flex size-13 items-center justify-center rounded-full",
                on ? "bg-card" : "bg-secondary"
              )}
            >
              <img src={`/icons/${tile.icon}.svg`} alt="" className="size-8" />
            </span>
            <span className="text-base font-medium text-foreground">
              {tile.label}
            </span>
            {on ? (
              <span
                aria-hidden
                className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <Check className="size-3.5" />
              </span>
            ) : null}
          </label>
        )
      })}
    </div>
  )
}
