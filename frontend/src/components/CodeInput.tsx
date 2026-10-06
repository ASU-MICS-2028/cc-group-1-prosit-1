import { useState } from "react"
import { cn } from "@/lib/utils"

const LENGTH = 6

/**
 * The six code boxes from the design. Underneath it is one ordinary input, so the phone's
 * "code from SMS" suggestion, pasting and screen readers all work; the boxes only show it.
 */
export function CodeInput({
  id,
  label,
  value,
  onChange,
  invalid = false,
  describedBy,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  describedBy?: string
}) {
  const [focused, setFocused] = useState(false)
  const current = Math.min(value.length, LENGTH - 1)

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={LENGTH}
        value={value}
        onChange={(event) =>
          onChange(event.target.value.replace(/\D/g, "").slice(0, LENGTH))
        }
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="absolute inset-0 z-10 size-full cursor-text bg-transparent text-transparent caret-transparent outline-none"
      />
      <div aria-hidden className="flex gap-2.5 lg:gap-3">
        {Array.from({ length: LENGTH }, (_, index) => {
          const digit = value[index]
          const active = focused && index === current && value.length < LENGTH
          return (
            <div
              key={index}
              className={cn(
                "flex h-15 flex-1 items-center justify-center rounded-xl text-xl font-medium text-primary lg:h-18 lg:w-16 lg:flex-none lg:rounded-[14px] lg:text-2xl lg:font-semibold",
                digit
                  ? "border bg-secondary"
                  : active
                    ? "border-2 border-primary bg-card"
                    : "border bg-card",
                invalid && "border-destructive"
              )}
            >
              {digit}
            </div>
          )
        })}
      </div>
    </div>
  )
}
