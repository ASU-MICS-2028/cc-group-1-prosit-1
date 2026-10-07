import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { FieldError } from "@/components/form/FieldError"
import { FieldLabel } from "@/components/form/FieldLabel"
import type en from "@/i18n/locales/en.json"
import { cn } from "@/lib/utils"

/** Steps reused outside the wizard (Edit farmer) can hide their big title. */
export interface StepProps {
  showTitle?: boolean
}

type ErrorKey = `register.errors.${keyof typeof en.register.errors}`

/**
 * One question on a step: the label with its speaker, the answer, and the pink box when the
 * answer is wrong. `id` names the label (for groups of chips or tiles) and the error box.
 */
export function Question({
  id,
  label,
  audioKey,
  htmlFor,
  error,
  after,
  children,
  className,
}: {
  id: string
  label: string
  audioKey: string
  /** For a single text box: the label points at it */
  htmlFor?: string
  /** A language-file key from the form rules (register.errors.*) */
  error?: string
  /** Shown under the error box (a "no answer" tick box, say) */
  after?: ReactNode
  children: ReactNode
  className?: string
}) {
  const { t } = useTranslation()

  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <FieldLabel id={`${id}-label`} htmlFor={htmlFor} audioKey={audioKey}>
        {label}
      </FieldLabel>
      {children}
      <FieldError
        id={`${id}-error`}
        message={error ? t(error as ErrorKey) : undefined}
      />
      {after}
    </section>
  )
}
