import { Minus, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

const STEP = 0.5

/** "How big is the farm?": minus and plus in half steps, or type the number (Figma "Size Stepper"). */
export function SizeStepper({
  id,
  value,
  unit,
  onChange,
  invalid = false,
  describedBy,
}: {
  id: string
  value: number
  unit: string
  onChange: (value: number) => void
  invalid?: boolean
  describedBy?: string
}) {
  const { t } = useTranslation()
  const round = (n: number) => Math.round(n * 2) / 2

  return (
    <div className="flex h-16 items-center justify-between rounded-full border bg-card p-2">
      <button
        type="button"
        aria-label={t("register.smaller")}
        onClick={() => onChange(Math.max(STEP, round(value - STEP)))}
        disabled={value <= STEP}
        className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40"
      >
        <Minus aria-hidden className="size-5.5" />
      </button>
      <div className="flex flex-col items-center">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={STEP}
          value={Number.isFinite(value) ? value : ""}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className="w-24 [appearance:textfield] bg-transparent text-center text-2xl leading-9 font-semibold text-foreground outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-sm font-medium text-muted-foreground">
          {unit}
        </span>
      </div>
      <button
        type="button"
        aria-label={t("register.bigger")}
        onClick={() => onChange(round(value + STEP))}
        className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Plus aria-hidden className="size-5.5" />
      </button>
    </div>
  )
}
