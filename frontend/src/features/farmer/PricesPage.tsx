import { ChevronRight, MapPin } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { getMyFarm, getPrices } from "@/api/farmer"
import { ChoiceChips } from "@/components/form/ChoiceChips"
import { Picture } from "@/components/Picture"
import { formatShortDate, formatTime, isToday } from "@/lib/dates"
import { NoDataYet } from "./DataStatus"
import { FarmerPage } from "./FarmerPage"
import { Change } from "./PriceCharts"
import { cropPicture, GROUPS, money } from "./prices"
import { useServerData } from "./useServerData"

type Filter = "mine" | "all" | keyof typeof GROUPS

/**
 * Market prices (Figma "Farmer · Market Prices"): the market, filters (my crops, all, grains, legumes,
 * tubers), then one row per crop with its photo, today's price and the week's change. A row opens the
 * crop's page with the 30-day chart, other markets and SMS alerts.
 */
export function Component() {
  const { t } = useTranslation()
  const state = useServerData("prices", getPrices)
  const mine = useServerData("me", getMyFarm).data?.farmer.crops ?? []
  const prices = state.data
  // Until the farmer picks one: their own crops when they have any.
  const [picked, setPicked] = useState<Filter | null>(null)
  const filter: Filter = picked ?? (mine.length ? "mine" : "all")
  const updated = prices
    ? t("farmerApp.prices.updated", {
        when: `${isToday(prices.updatedAt) ? t("sync.today") : formatShortDate(prices.updatedAt)} ${formatTime(prices.updatedAt)}`,
      })
    : undefined
  const shown = (prices?.prices ?? []).filter((p) =>
    filter === "all"
      ? true
      : filter === "mine"
        ? mine.length === 0 || mine.includes(p.crop)
        : (GROUPS[filter] as readonly string[]).includes(p.crop)
  )

  return (
    <FarmerPage
      tab
      title={t("farmerApp.prices.title")}
      subtitle={updated}
      source={prices?.source}
      state={state}
    >
      {!prices ? (
        <NoDataYet state={state} />
      ) : (
        <>
          <section className="flex items-center gap-3 rounded-[20px] border bg-card p-4">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
            >
              <MapPin className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-medium text-foreground">
                {prices.markets[0]}
              </span>
              <span className="block text-sm text-muted-foreground">
                {t("farmerApp.prices.otherMarkets", {
                  count: prices.markets.length - 1,
                })}
              </span>
            </span>
          </section>

          <ChoiceChips
            labelledBy="prices-filter"
            options={(
              [
                ...(mine.length ? (["mine"] as const) : []),
                "all",
                "grains",
                "legumes",
                "tubers",
              ] as const
            ).map((f) => ({
              value: f,
              label: t(`farmerApp.prices.filter.${f}`),
            }))}
            value={filter}
            onChange={(f) => setPicked(f)}
          />
          <span id="prices-filter" className="sr-only">
            {t("farmerApp.prices.filterLabel")}
          </span>

          <ul className="space-y-3">
            {shown.map((p) => {
              const picture = cropPicture(p.crop)
              return (
                <li key={p.crop}>
                  <Link
                    to={`/farmer/prices/${p.crop}`}
                    className="flex items-center gap-3 rounded-[20px] border bg-card p-3 pr-4 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {picture ? (
                      <Picture
                        source={picture}
                        alt=""
                        fit="cover"
                        className="size-12 shrink-0 rounded-full"
                        emojiClassName="size-10"
                      />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-medium text-foreground">
                        {t(`register.crops.${p.crop}`)}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {mine.includes(p.crop)
                          ? t("farmerApp.prices.perKgYours")
                          : t("farmerApp.prices.perKgShort")}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-base font-medium text-foreground tabular-nums">
                        {money(p.markets[0].pricePerKg)}
                      </span>
                      <Change percent={p.weekChangePercent} />
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="size-5 shrink-0 text-muted-foreground"
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
          <p className="text-sm text-muted-foreground">
            {t("farmerApp.prices.feedNote")}
          </p>
        </>
      )}
    </FarmerPage>
  )
}
