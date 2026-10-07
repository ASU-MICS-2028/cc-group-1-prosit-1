import { useId } from "react"
import { cn } from "@/lib/utils"

interface Option<T extends string> {
  value: T
  label: string
}

/**
 * Pill-shaped answers (Figma "Choice Chip"). One answer = radio buttons, several = checkboxes:
 * real inputs underneath, so the keyboard and screen readers work.
 */
export function ChoiceChips<T extends string>({
  labelledBy,
  options,
  value,
  onChange,
  multiple = false,
}: {
  labelledBy: string
  options: readonly Option<T>[]
} & (
  | { multiple?: false; value: T | null; onChange: (value: T) => void }
  | { multiple: true; value: readonly T[]; onChange: (value: T[]) => void }
)) {
  const name = useId()
  const selected = (option: T) =>
    multiple ? (value as readonly T[]).includes(option) : value === option

  function toggle(option: T) {
    if (multiple) {
      const current = value as readonly T[]
      ;(onChange as (v: T[]) => void)(
        current.includes(option)
          ? current.filter((v) => v !== option)
          : [...current, option]
      )
    } else {
      ;(onChange as (v: T) => void)(option)
    }
  }

  return (
    <div
      role={multiple ? "group" : "radiogroup"}
      aria-labelledby={labelledBy}
      className="flex flex-wrap gap-2"
    >
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "inline-flex h-12 cursor-pointer items-center rounded-full px-5 text-base font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
            selected(option.value)
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)]"
          )}
        >
          <input
            type={multiple ? "checkbox" : "radio"}
            name={name}
            value={option.value}
            checked={selected(option.value)}
            onChange={() => toggle(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}
