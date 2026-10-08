import { Check, Pencil, Phone, ShieldCheck, Volume2 } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { getMyFarm, type MyFarm } from "@/api/farmer"
import { Card, Facts } from "@/components/Blocks"
import { Button, buttonVariants } from "@/components/ui/button"
import { farmerFacts, farmerSpeech } from "@/features/farmers/describe"
import { Avatar } from "@/features/farmers/FarmerRow"
import { LANGUAGES } from "@/i18n"
import { formatLongDate } from "@/lib/dates"
import { maskPhone } from "@/lib/phone"
import { listen } from "@/lib/speech"
import { cn } from "@/lib/utils"
import { NoDataYet } from "./DataStatus"
import { FarmerPage } from "./FarmerPage"
import { toFacts } from "./profile"
import { useServerData } from "./useServerData"

/** My details: what MoFA has about the farmer, their officer and their visits. Read-only; changes go via the officer. */
export function Component() {
  const { t } = useTranslation()
  const state = useServerData("me", getMyFarm)
  const farm = state.data

  return (
    <FarmerPage title={t("farmerApp.details.title")} state={state} wide>
      {!farm ? <NoDataYet state={state} /> : <Details farm={farm} />}
    </FarmerPage>
  )
}

function Details({ farm }: { farm: MyFarm }) {
  const { t } = useTranslation()
  const facts = toFacts(farm.farmer)
  const f = farmerFacts(facts, t)
  const language =
    LANGUAGES.find((l) => l.code === farm.farmer.language)?.label ??
    farm.farmer.language

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0 space-y-5">
        <section className="flex flex-col gap-4 rounded-[30px] bg-cream p-4 md:flex-row md:items-center md:p-5">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Avatar name={farm.farmer.fullName} size="lg" />
            <div className="min-w-0">
              <h2 className="truncate text-xl leading-7.5 font-medium text-foreground">
                {farm.farmer.fullName}
              </h2>
              <p className="text-sm text-muted-foreground">{f.community}</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                <ShieldCheck aria-hidden className="size-4" />
                {t("farmerApp.details.consent", {
                  date: formatLongDate(farm.farmer.consentAt),
                })}
              </p>
            </div>
          </div>
          <div className="flex gap-2 md:w-50 md:flex-col">
            <Button
              size="xl"
              variant="secondary"
              className="flex-1 text-primary md:flex-none"
              onClick={() => listen(farmerSpeech(facts, t))}
            >
              <Volume2 aria-hidden />
              {t("farmerApp.details.listen")}
            </Button>
            <Link
              to="/farmer/details/change"
              className={cn(
                buttonVariants({ size: "xl" }),
                "flex-1 md:flex-none"
              )}
            >
              <Pencil aria-hidden />
              {t("farmerApp.rows.change")}
            </Link>
          </div>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <h3 className="mb-3 text-base font-medium text-foreground">
              {t("farmerApp.details.farm")}
            </h3>
            <Facts
              rows={[
                [t("farmers.facts.crops"), f.crops],
                [t("farmers.facts.size"), f.size],
                [t("farmers.facts.location"), f.location],
              ]}
            />
          </Card>
          <Card>
            <h3 className="mb-3 text-base font-medium text-foreground">
              {t("farmerApp.details.about")}
            </h3>
            <Facts
              rows={[
                [t("farmers.facts.phone"), f.phone],
                [t("farmers.facts.genderAge"), f.genderAge],
                [t("farmers.facts.language"), language],
                [t("farmers.facts.reachBy"), f.reachBy],
                [t("farmers.facts.needs"), f.needs],
              ]}
            />
          </Card>
        </div>
      </div>

      <div className="space-y-5">
        {farm.officer ? (
          <Card>
            <h3 className="mb-3 text-base font-medium text-foreground">
              {t("farmerApp.details.officer")}
            </h3>
            <div className="flex items-center gap-3">
              <Avatar name={farm.officer.fullName} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">
                  {farm.officer.fullName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[farm.officer.district, maskPhone(farm.officer.phoneE164)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <a
                href={`tel:${farm.officer.phoneE164}`}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "rounded-full px-4"
                )}
              >
                <Phone aria-hidden />
                {t("farmerApp.details.call")}
              </a>
            </div>
          </Card>
        ) : null}

        <Card>
          <h3 className="mb-3 text-base font-medium text-foreground">
            {t("farmerApp.details.visits")}
          </h3>
          {farm.visits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("farmerApp.details.noVisits")}
            </p>
          ) : (
            <ul className="space-y-3">
              {farm.visits.map((visit) => (
                <li key={visit.id} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Check className="size-4" />
                  </span>
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-foreground">
                      {formatLongDate(
                        visit.completedAt ?? `${visit.scheduledFor}T12:00:00Z`
                      )}
                    </p>
                    <p className="text-muted-foreground">
                      {visit.topics
                        .map((topic) => t(`visits.topics.${topic}`))
                        .join(", ")}
                    </p>
                    {visit.notes ? (
                      <p className="text-foreground">{visit.notes}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
