import { ChevronLeft, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import type { LocalFarmer } from "@/db/local"
import { initials } from "@/lib/phone"
import { cn } from "@/lib/utils"
import type { Registration } from "./schema"

type Person = Pick<
  Registration,
  "fullName" | "community" | "gender" | "ageBand"
>

/**
 * Check before saving (Figma 28): the number already belongs to a farmer on this phone. Families
 * often share one phone, so the officer decides: a different person (save) or the same one (open them).
 */
export function DuplicateCheck({
  existing,
  current,
  onBack,
  onDifferent,
  onSame,
  busy,
}: {
  existing: LocalFarmer
  current: Person
  onBack: () => void
  onDifferent: () => void
  onSame: () => void
  busy: boolean
}) {
  const { t, i18n } = useTranslation()
  // Ghana writes the day first (6 Oct), whatever the app language
  const registered = new Intl.DateTimeFormat([`${i18n.language}-GH`, "en-GB"], {
    day: "numeric",
    month: "short",
  }).format(new Date(existing.createdAt))

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-5 px-4 pt-3 pb-8 md:px-8 md:pt-8">
      <header className="flex items-center gap-3">
        <button
          type="button"
          aria-label={t("common.back")}
          onClick={onBack}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:size-11"
        >
          <ChevronLeft aria-hidden className="size-5.5" />
        </button>
        <h1 className="text-xl leading-7.5 font-semibold text-foreground md:text-2xl">
          {t("register.duplicate.title")}
        </h1>
      </header>

      <section
        role="alert"
        className="flex gap-3 rounded-3xl bg-cream p-4 md:p-5"
      >
        <TriangleAlert aria-hidden className="size-6 shrink-0 text-warning" />
        <div className="space-y-1">
          <h2 className="font-semibold text-foreground">
            {t("register.duplicate.warningTitle")}
          </h2>
          <p className="text-sm text-foreground">
            {t("register.duplicate.warningText")}
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <PersonCard
          heading={t("register.duplicate.existing")}
          person={existing}
          extra={t("register.duplicate.registeredOn", { date: registered })}
        />
        <PersonCard
          heading={t("register.duplicate.registering")}
          person={current}
          highlight
        />
      </div>

      <div className="mt-auto flex flex-col gap-3 md:mt-2 md:flex-row-reverse">
        <Button
          size="xl"
          onClick={onDifferent}
          disabled={busy}
          className="md:flex-1"
        >
          {t("register.duplicate.different")}
        </Button>
        <Button
          size="xl"
          variant="secondary"
          onClick={onSame}
          disabled={busy}
          className="text-primary md:flex-1"
        >
          {t("register.duplicate.same", {
            name: existing.fullName.split(" ")[0],
          })}
        </Button>
      </div>
    </main>
  )
}

function PersonCard({
  heading,
  person,
  extra,
  highlight = false,
}: {
  heading: string
  person: Person
  extra?: string
  highlight?: boolean
}) {
  const { t } = useTranslation()
  const details = [
    person.community,
    [
      person.gender && t(`register.genders.${person.gender}`).toLowerCase(),
      person.ageBand && t(`register.ages.${person.ageBand}`),
    ]
      .filter(Boolean)
      .join(", "),
    extra,
  ].filter(Boolean)

  return (
    <section
      className={cn(
        "space-y-3 rounded-3xl bg-card p-4 md:p-5",
        highlight ? "border-2 border-primary" : "border"
      )}
    >
      <h2 className="text-sm font-medium text-muted-foreground">{heading}</h2>
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary"
        >
          {initials(person.fullName)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">
            {person.fullName}
          </p>
          <p className="text-sm text-muted-foreground">{details.join(" · ")}</p>
        </div>
      </div>
    </section>
  )
}
