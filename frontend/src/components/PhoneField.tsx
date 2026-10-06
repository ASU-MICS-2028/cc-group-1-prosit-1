import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

/** The phone box from the design: a fixed "+233" pill, then the rest of the number. */
export function PhoneField({
  id,
  value,
  onChange,
  invalid = false,
  describedBy,
  autoFocus,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  describedBy?: string
  autoFocus?: boolean
}) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        "flex h-15 items-center gap-3 rounded-[30px] border-2 bg-card py-1.5 pr-4 pl-1.5 focus-within:ring-3 focus-within:ring-ring/50",
        invalid ? "border-destructive" : "border-primary"
      )}
    >
      <span
        aria-hidden
        className="flex h-12 w-21 shrink-0 items-center justify-center rounded-3xl bg-secondary font-medium text-primary"
      >
        +233
      </span>
      <label htmlFor={id} className="sr-only">
        {t("login.phoneLabel")}
      </label>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        autoFocus={autoFocus}
        placeholder="24 000 0000"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="min-w-0 flex-1 bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}
