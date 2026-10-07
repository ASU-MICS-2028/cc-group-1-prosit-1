import { TrendingDown, TrendingUp } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { getMyFarm, getPrices, type Prices } from "@/api/farmer"
import { formatTime, isToday, formatShortDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { NoDataYet } from "./DataStatus"
import { FarmerPage } from "./FarmerPage"
import { useServerData } from "./useServerData"

type Crop = Prices["prices"][number]["crop"]

const money = (value: number) => `GH₵ ${value.toFixed(2)}`

/** Market prices (Figma P2 · D1): every crop in the nearby markets, the week's change, and 30 days for one crop. */
export function Component() {
  const { t } = useTranslation()
  const state = useServerData("prices", getPrices)
  const mine = useServerData("me", getMyFarm).data?.farmer.crops ?? []
  const prices = state.data
  const [picked, setPicked] = useState<Crop | null>(null)
  const chosen =
    prices?.prices.find((p) => p.crop === picked) ?? prices?.prices[0]
  const updated = prices
    ? t("farmerApp.prices.updated", {
        when: `${isToday(prices.updatedAt) ? t("sync.today") : formatShortDate(prices.updatedAt)} ${formatTime(prices.updatedAt)}`,
      })
    : undefined

  return (
    <FarmerPage
      title={t("farmerApp.prices.title")}
      subtitle={updated}
      source={prices?.source}
      state={state}
      wide
    >
      {!prices || !chosen ? (
        <NoDataYet state={state} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Phones: one card per crop. Computers: the table across the markets. */}
          <ul className="space-y-3 lg:hidden">
            {prices.prices.map((p) => (
              <li key={p.crop}>
                <button
                  type="button"
                  onClick={() => setPicked(p.crop)}
                  aria-pressed={p.crop === chosen.crop}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    p.crop === chosen.crop && "border-primary bg-secondary"
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-medium text-foreground">
                      {t(`register.crops.${p.crop}`)}
                      {mine.includes(p.crop) ? (
                        <span className="ml-2 rounded-full bg-cream px-2 py-0.5 text-xs text-warning">
                          {t("farmerApp.prices.yourCrop")}
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {t("farmerApp.prices.perKg", {
                        price: money(p.markets[0].pricePerKg),
                      })}{" "}
                      · {p.markets[0].market}
                    </span>
                  </span>
                  <Change percent={p.weekChangePercent} />
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-[20px] border bg-card lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary text-primary">
                <tr>
                  <th className="px-5 py-3 font-medium">
                    {t("farmerApp.prices.crop")}
                  </th>
                  {prices.markets.map((m) => (
                    <th key={m} className="px-3 py-3 font-medium">
                      {m}
                    </th>
                  ))}
                  <th className="px-3 py-3 font-medium">
                    {t("farmerApp.prices.thisWeek")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {prices.prices.map((p) => (
                  <tr
                    key={p.crop}
                    onClick={() => setPicked(p.crop)}
                    className={cn(
                      "cursor-pointer border-t",
                      p.crop === chosen.crop ? "bg-cream" : "hover:bg-muted"
                    )}
                  >
                    <td className="px-5 py-3 text-base text-foreground">
                      {t(`register.crops.${p.crop}`)}
                      {mine.includes(p.crop) ? (
                        <span className="ml-2 rounded-full bg-cream px-2 py-0.5 text-xs text-warning">
                          {t("farmerApp.prices.yourCrop")}
                        </span>
                      ) : null}
                    </td>
                    {p.markets.map((m) => (
                      <td key={m.market} className="px-3 py-3 text-foreground">
                        {m.pricePerKg.toFixed(2)}
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      <Change percent={p.weekChangePercent} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="order-first space-y-2 self-start rounded-[20px] border bg-card p-5 lg:order-none">
            <p className="text-sm text-muted-foreground">
              {t("farmerApp.prices.trend", {
                crop: t(`register.crops.${chosen.crop}`),
                market: chosen.markets[0].market,
              })}
            </p>
            <p className="text-2xl font-medium text-foreground">
              {t("farmerApp.prices.perKg", {
                price: money(chosen.markets[0].pricePerKg),
              })}
            </p>
            <Sparkline values={chosen.last30Days} />
          </section>
        </div>
      )}
    </FarmerPage>
  )
}

/** "+4%" in green with an arrow up, "-2%" in red with an arrow down. */
function Change({ percent }: { percent: number }) {
  const up = percent >= 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium",
        up ? "text-primary" : "text-destructive"
      )}
    >
      <Icon aria-hidden className="size-4" />
      {up ? "+" : ""}
      {percent}%
    </span>
  )
}

/** A small area chart of the last 30 days: no chart library, just an SVG path. */
function Sparkline({ values }: { values: number[] }) {
  const width = 300
  const height = 110
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values.map((v, i) => [
    (i / Math.max(values.length - 1, 1)) * width,
    height - 8 - ((v - min) / span) * (height - 16),
  ])
  const line = points
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ")
  const [lastX, lastY] = points[points.length - 1]
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-28 w-full"
      role="img"
      aria-hidden
    >
      <polygon
        points={`0,${height} ${line} ${width},${height}`}
        className="fill-secondary"
      />
      <polyline
        points={line}
        fill="none"
        className="stroke-primary"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={4} className="fill-primary" />
    </svg>
  )
}
