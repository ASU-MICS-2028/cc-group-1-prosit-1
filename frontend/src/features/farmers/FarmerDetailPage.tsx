import { CalendarPlus, Pencil, ShieldCheck } from "lucide-react"
import type { ReactNode } from "react"
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useSession } from "@/auth/session"
import { BackHeader, Card, Facts } from "@/components/Blocks"
import { SyncIcon } from "@/components/SyncStatus"
import { Button, buttonVariants } from "@/components/ui/button"
import { LANGUAGES } from "@/i18n"
import { formatLongDate, formatShortDate } from "@/lib/dates"
import { listen } from "@/lib/speech"
import { usePhotoUrl } from "@/lib/usePhotoUrl"
import { cn } from "@/lib/utils"
import { farmerFacts, farmerSpeech } from "./describe"
import { Avatar } from "./FarmerRow"
import { useFarmer } from "./farmers"

/** One farmer's page (Figma 14 / D17): who they are, the farm, contact and money, and consent. */
export function Component() {
  const { t } = useTranslation()
  const { id } = useParams()
  const session = useSession()
  const farmer = useFarmer(id)
  const photo = usePhotoUrl(farmer?.photoId)

  if (farmer === undefined) return null // still opening the database
  if (farmer === null) {
    return (
      <div className="space-y-4">
        <BackHeader title={t("farmers.detailTitle")} to="/farmers" />
        <p className="rounded-[20px] border border-dashed p-8 text-center text-muted-foreground">
          {t("farmers.notFound")}
        </p>
      </div>
    )
  }

  const f = farmerFacts(farmer, t)
  const language =
    LANGUAGES.find((l) => l.code === farmer.language)?.label ?? farmer.language
  const recordedBy =
    farmer.registeredById === session?.user.id
      ? (session.user.fullName.split(" ")[0] ?? "")
      : t("farmers.anotherOfficer")
  const edit = (section: string) => `/farmers/${farmer.id}/edit/${section}`

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="md:hidden">
        <BackHeader
          title={t("farmers.detailTitle")}
          to="/farmers"
          action={
            <Link
              to={edit("personal")}
              aria-label={t("farmers.edit")}
              className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Pencil aria-hidden className="size-5" />
            </Link>
          }
        />
      </div>
      <div className="hidden md:block">
        <BackHeader
          title={`${t("farmers.title")} / ${farmer.fullName}`}
          to="/farmers"
        />
      </div>

      <div className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-4 md:space-y-5">
          <section className="flex flex-col gap-4 rounded-[30px] bg-cream p-4 md:flex-row md:items-center md:p-5">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <Avatar name={farmer.fullName} size="lg" />
              <div className="min-w-0 space-y-1">
                <h2 className="truncate text-xl leading-7.5 font-medium text-foreground md:text-2xl">
                  {farmer.fullName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {f.community || t("register.review.notGiven")}
                  <span className="hidden md:inline">
                    {" "}
                    ·{" "}
                    {t("farmers.registeredOn", {
                      date: formatShortDate(farmer.createdAt),
                    })}
                  </span>
                </p>
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <SyncIcon
                    status={farmer.syncStatus}
                    className="size-6 bg-transparent"
                  />
                  <span
                    className={cn(
                      farmer.syncStatus === "waiting" && "text-warning",
                      farmer.syncStatus === "synced" && "text-primary",
                      farmer.syncStatus === "failed" && "text-destructive"
                    )}
                  >
                    {t(`sync.${farmer.syncStatus}Status`)}
                  </span>
                </p>
              </div>
            </div>
            <div className="hidden w-50 shrink-0 flex-col gap-2 md:flex">
              <Button
                size="xl"
                variant="secondary"
                className="text-primary"
                onClick={() => listen(farmerSpeech(farmer, t))}
              >
                {t("farmers.listen")}
              </Button>
              <Link
                to={edit("personal")}
                className={buttonVariants({ size: "xl" })}
              >
                {t("farmers.editFarmer")}
              </Link>
            </div>
          </section>

          {farmer.syncStatus === "failed" && farmer.syncProblem ? (
            <p
              role="alert"
              className="rounded-xl bg-destructive-soft px-4 py-3 text-sm font-medium text-destructive"
            >
              {farmer.syncProblem}
            </p>
          ) : null}

          <div className="flex gap-3 md:hidden">
            <Button
              size="xl"
              variant="secondary"
              className="flex-1 text-primary"
              onClick={() => listen(farmerSpeech(farmer, t))}
            >
              {t("farmers.listenProfile")}
            </Button>
          </div>
          <Link
            to={`/farmers/${farmer.id}/visit`}
            className={cn(
              buttonVariants({ size: "xl", variant: "secondary" }),
              "w-full text-primary md:w-auto"
            )}
          >
            <CalendarPlus aria-hidden />
            {t("visits.log")}
          </Link>

          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            <Section
              title={t("register.review.about")}
              editTo={edit("personal")}
            >
              <Facts
                rows={[
                  [t("farmers.facts.phone"), f.phone],
                  [t("farmers.facts.genderAge"), f.genderAge],
                  [t("farmers.facts.language"), language],
                  [t("farmers.facts.community"), f.community],
                ]}
              />
            </Section>
            {/* Phones: the farm comes second (Figma 14); computers show it on the right (D17) */}
            <div className="lg:hidden">
              <Section title={t("register.review.farm")} editTo={edit("farm")}>
                {photo ? (
                  <img
                    src={photo}
                    alt={t("register.location.photoAlt")}
                    className="mb-3 aspect-302/140 w-full rounded-2xl object-cover"
                  />
                ) : null}
                <Facts
                  rows={[
                    [t("farmers.facts.crops"), f.crops],
                    [t("farmers.facts.size"), f.size],
                    [t("farmers.facts.location"), f.location],
                  ]}
                />
              </Section>
            </div>
            <Section title={t("farmers.contactMoney")} editTo={edit("contact")}>
              <Facts
                rows={[
                  [t("farmers.facts.phoneType"), f.phoneType],
                  [t("farmers.facts.reachBy"), f.reachBy],
                  [t("farmers.facts.mobileMoney"), f.mobileMoney],
                  [t("farmers.facts.needs"), f.needs],
                ]}
              />
            </Section>
          </div>
        </div>

        <div className="space-y-4 md:space-y-5">
          <div className="hidden lg:block">
            <Section title={t("register.review.farm")} editTo={edit("farm")}>
              {photo ? (
                <img
                  src={photo}
                  alt={t("register.location.photoAlt")}
                  className="mb-3 aspect-302/140 w-full rounded-2xl object-cover"
                />
              ) : null}
              <Facts
                rows={[
                  [t("farmers.facts.crops"), f.crops],
                  [t("farmers.facts.size"), f.size],
                  [t("farmers.facts.location"), f.location],
                ]}
              />
            </Section>
          </div>
          <Card>
            <h3 className="flex items-center gap-2 text-base font-medium text-foreground">
              <ShieldCheck aria-hidden className="size-5 text-primary" />
              {t("farmers.consentGiven")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("farmers.consentLine", {
                date: formatLongDate(farmer.consentAt),
                language,
                officer: recordedBy,
              })}
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  editTo,
  children,
}: {
  title: string
  editTo: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        <Link
          to={editTo}
          aria-label={t("register.review.edit", { section: title })}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Pencil aria-hidden className="size-4" />
          {t("register.review.editShort")}
        </Link>
      </div>
      {children}
    </Card>
  )
}
