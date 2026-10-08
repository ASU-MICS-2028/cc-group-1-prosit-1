import { CalendarClock, ChevronRight, Leaf, Sprout } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  getHarvestForecast,
  getMyFarm,
  getPrices,
  type HarvestForecast,
  type Prices,
} from "@/api/farmer"
import { RangeChart } from "@/components/Charts"
import i18n from "@/i18n"
import { NoDataYet } from "./DataStatus"
import { FarmerPage } from "./FarmerPage"
import { useServerData } from "./useServerData"

/** "September" for month 9, in the app language. */
function monthName(month: number) {
  return new Intl.DateTimeFormat([`${i18n.language}-GH`, "en-GB"], {
    month: "long",
  }).format(new Date(2026, month - 1, 15))
}

/** Harvest forecast: per crop, the bags the farm could give this season and when it is usually ready. */
export function Component() {
  const { t } = useTranslation()
  const state = useServerData("harvest", getHarvestForecast)
  const forecast = state.data
  const prices = useServerData("prices", getPrices).data
  const farm = useServerData("me", getMyFarm).data?.farmer

  return (
    <FarmerPage
      title={t("farmerApp.harvest.title")}
      source={forecast?.source}
      state={state}
    >
      <p className="text-base text-muted-foreground">
        {t("farmerApp.harvest.intro")}
      </p>
      {!forecast ? (
        <NoDataYet state={state} />
      ) : forecast.crops.length === 0 ? (
        <p className="rounded-[20px] border border-dashed p-6 text-center text-muted-foreground">
          {t("farmerApp.harvest.none")}
        </p>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section
            aria-labelledby="harvest-chart"
            className="space-y-3 rounded-[20px] border bg-card p-5"
          >
            <h2
              id="harvest-chart"
              className="text-base font-medium text-foreground"
            >
              {t("farmerApp.harvest.chartTitle")}
            </h2>
            <RangeChart
              title={t("farmerApp.harvest.chartTitle")}
              unit={t("farmerApp.harvest.axis")}
              lowLabel={t("farmerApp.harvest.atLeast")}
              highLabel={t("farmerApp.harvest.couldReach")}
              rowHeader={t("farmerApp.harvest.crop")}
              noteHeader={t("farmerApp.harvest.when")}
              format={(low, high) =>
                t("farmerApp.harvest.range", { low, high })
              }
              rows={forecast.crops.map((c) => ({
                label: t(`register.crops.${c.crop}`),
                note: t("farmerApp.harvest.ready", {
                  month: monthName(c.harvestMonth),
                }),
                low: c.lowBags,
                high: c.highBags,
              }))}
            />
          </section>
          <Worth forecast={forecast} prices={prices} />
          <Countdown forecast={forecast} />
          {farm ? (
            <section className="space-y-2 rounded-[20px] bg-cream p-5">
              <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
                <Sprout aria-hidden className="size-5 text-primary" />
                {t("farmerApp.harvest.basedOn")}
              </h2>
              <p className="text-sm text-foreground">
                {[
                  farm.farmSize
                    ? `${farm.farmSize} ${t(`register.units.${farm.farmSizeUnit}`).toLowerCase()}`
                    : null,
                  farm.soil && farm.soil !== "not_sure"
                    ? t("farmerApp.harvest.soil", {
                        soil: t(`register.soils.${farm.soil}`).toLowerCase(),
                      })
                    : null,
                  farm.crops.map((c) => t(`register.crops.${c}`)).join(", "),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("farmerApp.harvest.wrong")}
              </p>
            </section>
          ) : null}
          <Tips />
        </div>
      )}
    </FarmerPage>
  )
}

/** Bags × 100 kg × today's price at the farmer's nearest market listed first: what the harvest could fetch. */
function Worth({
  forecast,
  prices,
}: {
  forecast: HarvestForecast
  prices: Prices | null | undefined
}) {
  const { t } = useTranslation()
  if (!prices) return null
  const rows = forecast.crops
    .map((c) => {
      const p = prices.prices.find((x) => x.crop === c.crop)?.markets[0]
      return p
        ? {
            crop: c.crop,
            market: p.market,
            low: c.lowBags * 100 * p.pricePerKg,
            high: c.highBags * 100 * p.pricePerKg,
          }
        : null
    })
    .filter((r) => r !== null)
  if (rows.length === 0) return null
  const cedis = (v: number) =>
    `GH₵ ${(Math.round(v / 10) * 10).toLocaleString("en-GH")}`
  const low = rows.reduce((s, r) => s + r.low, 0)
  const high = rows.reduce((s, r) => s + r.high, 0)

  return (
    <section
      aria-labelledby="harvest-worth"
      className="space-y-3 rounded-[20px] bg-secondary p-5"
    >
      <h2 id="harvest-worth" className="text-base font-medium text-foreground">
        {t("farmerApp.harvest.worthTitle")}
      </h2>
      <p className="text-2xl font-semibold text-primary">
        {t("farmerApp.harvest.worthRange", {
          low: cedis(low),
          high: cedis(high),
        })}
      </p>
      <ul className="space-y-1.5 text-sm text-foreground">
        {rows.map((r) => (
          <li key={r.crop} className="flex justify-between gap-3">
            <span>{t(`register.crops.${r.crop}`)}</span>
            <span className="tabular-nums">
              {t("farmerApp.harvest.worthRange", {
                low: cedis(r.low),
                high: cedis(r.high),
              })}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {t("farmerApp.harvest.worthNote", { market: rows[0].market })}
      </p>
      <Link
        to="/farmer/prices"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary"
      >
        {t("farmerApp.harvest.seePrices")}
        <ChevronRight aria-hidden className="size-4" />
      </Link>
    </section>
  )
}

/** How many months until each crop is usually ready. */
function Countdown({ forecast }: { forecast: HarvestForecast }) {
  const { t } = useTranslation()
  const now = new Date().getMonth() + 1
  return (
    <section
      aria-labelledby="harvest-when"
      className="space-y-3 rounded-[20px] border bg-card p-5"
    >
      <h2
        id="harvest-when"
        className="flex items-center gap-2 text-base font-medium text-foreground"
      >
        <CalendarClock aria-hidden className="size-5 text-primary" />
        {t("farmerApp.harvest.whenTitle")}
      </h2>
      <ul className="divide-y">
        {forecast.crops.map((c) => {
          const months = (c.harvestMonth - now + 12) % 12
          return (
            <li
              key={c.crop}
              className="flex items-center justify-between py-2.5"
            >
              <span className="text-sm font-medium text-foreground">
                {t(`register.crops.${c.crop}`)}
              </span>
              <span className="text-sm text-muted-foreground">
                {months === 0
                  ? t("farmerApp.harvest.now", {
                      month: monthName(c.harvestMonth),
                    })
                  : t("farmerApp.harvest.inMonths", {
                      count: months,
                      month: monthName(c.harvestMonth),
                    })}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const TIPS = [
  { key: "spacing", lesson: "maize-spacing" },
  { key: "pests", lesson: "fall-armyworm-signs" },
  { key: "soil", lesson: "compost-at-home" },
  { key: "storage", lesson: "dry-grain-storage" },
] as const

/** What moves the harvest from "at least" towards "could reach", each with its lesson. */
function Tips() {
  const { t } = useTranslation()
  return (
    <section
      aria-labelledby="harvest-tips"
      className="space-y-3 rounded-[20px] border bg-card p-5"
    >
      <h2
        id="harvest-tips"
        className="flex items-center gap-2 text-base font-medium text-foreground"
      >
        <Leaf aria-hidden className="size-5 text-primary" />
        {t("farmerApp.harvest.tipsTitle")}
      </h2>
      <ul className="divide-y">
        {TIPS.map((tip) => (
          <li key={tip.key}>
            <Link
              to="/farmer/lessons"
              className="flex items-center gap-3 py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">
                  {t(`farmerApp.harvest.tips.${tip.key}`)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t("farmerApp.harvest.lesson", {
                    title: t(`farmerApp.lessons.items.${tip.lesson}.title`),
                  })}
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
            </Link>
          </li>
        ))}
        <li>
          <Link
            to="/farmer/crop-check"
            className="flex items-center gap-3 py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
              {t("farmerApp.harvest.tips.check")}
            </span>
            <ChevronRight
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
          </Link>
        </li>
      </ul>
    </section>
  )
}
