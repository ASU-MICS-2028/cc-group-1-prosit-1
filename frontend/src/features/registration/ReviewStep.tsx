import { Pencil } from "lucide-react"
import { useFormContext, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { FieldError } from "@/components/form/FieldError"
import { QuestionTitle } from "@/components/QuestionTitle"
import { toE164 } from "@/lib/phone"
import { cn } from "@/lib/utils"
import type { Registration } from "./schema"

/** "+233240001234" as "+233 24 000 1234", easy to read back to the farmer. */
function spaced(e164: string) {
  return `${e164.slice(0, 4)} ${e164.slice(4, 6)} ${e164.slice(6, 9)} ${e164.slice(9)}`
}

/**
 * Check and save (Figma 11 / D14): every answer on cards, each with Edit to jump back to its step.
 * Phones show money and help on one card; computers give help its own card (two columns of three).
 */
export function ReviewStep({
  onEdit,
  saveFailed,
}: {
  onEdit: (step: number) => void
  saveFailed: boolean
}) {
  const { t } = useTranslation()
  const { control } = useFormContext<Registration>()
  const v = useWatch({ control }) as Registration
  const join = (items: string[]) => items.join(", ")
  const phone = toE164(v.phone)

  const about = [
    v.fullName,
    v.hasNoPhone ? t("register.review.noPhone") : phone ? spaced(phone) : null,
    join(
      [
        v.gender && t(`register.genders.${v.gender}`),
        v.ageBand && t(`register.ages.${v.ageBand}`),
      ].filter((x): x is string => !!x)
    ),
    join([v.community, v.regionDistrict].filter(Boolean)),
  ]
  const farm = [
    join(v.crops.map((c) => t(`register.crops.${c}`))),
    t(`register.review.${v.farmSizeUnit}`, { count: v.farmSize }),
    v.soil && t(`register.soils.${v.soil}`),
    join(v.plantingSeasons.map((s) => t(`register.seasons.${s}`))),
  ]
  const location = [
    v.latitude !== null && v.longitude !== null
      ? `${t("register.review.located")} · ${v.latitude}, ${v.longitude}`
      : t("register.review.noLocation"),
    v.photoId ? t("register.review.photoTaken") : t("register.review.noPhoto"),
  ]
  const contact = [
    v.phoneType && t(`register.phoneTypes.${v.phoneType}`),
    v.dataPurchase && t(`register.dataPurchases.${v.dataPurchase}`),
    join(v.reachChannels.map((c) => t(`register.channels.${c}`))),
  ]
  const money = [
    v.incomeSources.length > 0 &&
      t("register.review.incomeFrom", {
        list: join(
          v.incomeSources.map((s) => t(`register.incomeSources.${s}`))
        ),
      }),
    v.hasBankAccount === null
      ? null
      : `${t("register.money.bank")} ${t(`register.bankAnswers.${v.hasBankAccount ? "yes" : "no"}`)}`,
    v.mobileMoney && v.mobileMoney !== "skip"
      ? `${t("register.money.mobileMoney")} ${t(`register.mobileMoneyAnswers.${v.mobileMoney}`)}`
      : null,
  ]
  const help = [
    v.lastAgentVisit &&
      `${t("register.help.lastVisit")} ${t(`register.lastVisits.${v.lastAgentVisit}`)}`,
    join(v.helpNeeded.map((h) => t(`register.helpNeeds.${h}`))),
  ]

  return (
    <>
      <QuestionTitle
        title={t("register.review.title")}
        audioKey="register.review.title"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          title={t("register.review.about")}
          lines={about}
          onEdit={() => onEdit(2)}
        />
        <Card
          title={t("register.review.farm")}
          lines={farm}
          onEdit={() => onEdit(3)}
        />
        <Card
          title={t("register.review.locationPhoto")}
          lines={location}
          onEdit={() => onEdit(4)}
        />
        <Card
          title={t("register.review.contact")}
          lines={contact}
          onEdit={() => onEdit(5)}
        />
        {/* Phones: one card. Computers: Money and Help needed side by side. */}
        <Card
          title={t("register.review.moneyHelp")}
          lines={[...money, ...help]}
          onEdit={() => onEdit(6)}
          className="md:hidden"
        />
        <Card
          title={t("register.steps.money")}
          lines={money}
          onEdit={() => onEdit(6)}
          className="hidden md:flex"
        />
        <Card
          title={t("register.review.helpNeeded")}
          lines={help}
          onEdit={() => onEdit(7)}
          className="hidden md:flex"
        />
      </div>
      <FieldError
        id="save-error"
        message={saveFailed ? t("register.review.saveFailed") : undefined}
      />
    </>
  )
}

function Card({
  title,
  lines,
  onEdit,
  className,
}: {
  title: string
  lines: (string | null | false | undefined)[]
  onEdit: () => void
  className?: string
}) {
  const { t } = useTranslation()
  const shown = lines.filter((line): line is string => !!line)

  return (
    <section
      className={cn(
        "flex flex-col gap-2 rounded-3xl border bg-card p-4 md:p-5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <button
          type="button"
          onClick={onEdit}
          aria-label={t("register.review.edit", { section: title })}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-secondary px-3 text-sm font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Pencil aria-hidden className="size-4" />
          {t("register.review.editShort")}
        </button>
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("register.review.notGiven")}
        </p>
      ) : (
        shown.map((line) => (
          <p key={line} className="text-sm text-foreground">
            {line}
          </p>
        ))
      )}
    </section>
  )
}
