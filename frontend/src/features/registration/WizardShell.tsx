import { Check, ChevronLeft } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { STEPS } from "./schema"

/**
 * The frame around every registration step. One layout, switched by width (team rule):
 * - phone (< 768 px): Figma 04 to 11, a header with the step name and progress, Back and Next at the bottom;
 * - 768 px and up: Figma D07 to D14, a top bar ("Register a farmer", Save and exit), the progress
 *   across, and from 1024 px the cream guide panel with the picture and the list of steps.
 */
export function WizardShell({
  step,
  title,
  subtitle,
  draftSaved,
  onBack,
  onSaveAndExit,
  back,
  next,
  children,
}: {
  /** 1 to 7, or 8 for Check and save */
  step: number
  /** Step name: "About the farmer" */
  title: string
  /** "Step 2 of 7", or "All 7 steps done" */
  subtitle: string
  /** False until the farmer agrees: nothing is kept before consent */
  draftSaved: boolean
  onBack: () => void
  onSaveAndExit: () => void
  back: { label: string; onClick: () => void }
  next: { label: string; onClick: () => void; busy?: boolean }
  children: ReactNode
}) {
  const { t } = useTranslation()
  const guide = STEPS[Math.min(step, STEPS.length) - 1]
  const illustration =
    step > STEPS.length ? "registration-form" : guide.illustration

  return (
    <main className="min-h-svh bg-background pb-28 md:pb-10">
      {/* Header (phone) / top bar (computer) */}
      <header className="sticky top-0 z-10 bg-background px-4 pt-3 pb-2 md:static md:bg-card md:px-8 md:pt-5 md:pb-4">
        <div className="flex items-center gap-3 md:gap-3.5">
          <button
            type="button"
            aria-label={t("common.back")}
            onClick={onBack}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:size-11"
          >
            <ChevronLeft aria-hidden className="size-5.5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base leading-6 font-medium text-foreground md:text-xl md:leading-7.5">
              {t("register.title")}
            </p>
            {/* The step's name is the big title below on phones; computers repeat it here */}
            <p className="truncate text-sm font-medium text-muted-foreground">
              {subtitle}
              <span className="hidden md:inline"> · {title}</span>
            </p>
          </div>
          {draftSaved ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary py-1.5 pr-3 pl-2.5 text-sm font-medium text-primary md:gap-1.5 md:pr-3.5 md:pl-3">
              <Check aria-hidden className="size-3.5 md:size-4" />
              {t("register.draftSaved")}
            </span>
          ) : null}
          <Button
            variant="secondary"
            size="xl"
            onClick={onSaveAndExit}
            className="hidden w-47.5 text-primary md:inline-flex"
          >
            {t("register.saveAndExit")}
          </Button>
        </div>
        <Progress step={step} className="mt-3.5 md:hidden" />
      </header>
      <Progress
        step={step}
        className="hidden px-8 md:mt-2 md:flex md:gap-1.5"
      />

      <div className="md:flex md:gap-12 md:px-8 md:pt-6">
        {/* Guide panel (computer, from 1024 px) */}
        <aside className="hidden w-105 shrink-0 flex-col gap-4.5 self-start rounded-[30px] bg-cream p-6 lg:flex">
          <img
            src={`/illustrations/${illustration}.svg`}
            alt=""
            decoding="async"
            className="mx-auto size-62.5 object-contain"
          />
          <p className="text-base text-foreground">
            {t(step > STEPS.length ? "register.guideReview" : "register.guide")}
          </p>
          <ol className="space-y-2">
            {STEPS.map((s, index) => {
              const n = index + 1
              const done = n < step
              const current = n === step
              return (
                <li key={s.key} className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-6.5 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                      done && "bg-primary text-primary-foreground",
                      current && "border-2 border-primary bg-card text-primary",
                      !done && !current && "bg-card text-muted-foreground"
                    )}
                  >
                    {done ? <Check aria-hidden className="size-3.5" /> : n}
                  </span>
                  <span
                    className={cn(
                      "text-base",
                      current && "font-semibold text-primary",
                      done && "text-foreground",
                      !done && !current && "text-muted-foreground"
                    )}
                  >
                    {t(`register.steps.${s.key}`)}
                  </span>
                </li>
              )
            })}
          </ol>
        </aside>

        {/* Questions */}
        <div className="flex min-w-0 flex-1 flex-col gap-6 px-4 pt-4 md:px-0 md:pt-0">
          {children}
          {/* Back and Next: fixed at the bottom on phones, bottom right on computers */}
          <div className="fixed inset-x-0 bottom-0 z-10 flex gap-3 bg-background px-4 py-3 md:static md:mt-auto md:justify-end md:bg-transparent md:px-0 md:pt-6 md:pb-0">
            <Button
              variant="secondary"
              size="xl"
              onClick={back.onClick}
              className="w-30 text-primary md:w-40"
            >
              {back.label}
            </Button>
            <Button
              size="xl"
              onClick={next.onClick}
              disabled={next.busy}
              className="flex-1 md:w-60 md:flex-none"
            >
              {next.label}
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}

function Progress({ step, className }: { step: number; className?: string }) {
  return (
    <div aria-hidden className={cn("flex gap-1", className)}>
      {STEPS.map((s, index) => (
        <span
          key={s.key}
          className={cn(
            "h-1.5 flex-1 rounded-[3px]",
            index < step ? "bg-primary" : "bg-secondary"
          )}
        />
      ))}
    </div>
  )
}
