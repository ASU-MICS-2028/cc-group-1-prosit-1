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
      tab
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
            <PriceTrend values={chosen.last30Days} money={money} />
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

/**
 * The last 30 days of one price, readable: a price axis in cedis with gridlines, days along the bottom,
 * the high and the low marked, today's price at the end. No chart library, just SVG.
 */
function PriceTrend({
  values,
  money,
}: {
  values: number[]
  money: (v: number) => string
}) {
  const { t } = useTranslation()
  const W = 340
  const H = 170
  const left = 44
  const right = 12
  const top = 14
  const bottom = 24
  const low = Math.min(...values)
  const high = Math.max(...values)
  // Axis from the half-cedi below the low to the half-cedi above the high, in 4 even steps.
  const from = Math.floor(low * 2) / 2
  const to = Math.max(Math.ceil(high * 2) / 2, from + 0.5)
  const ticks = Array.from(
    { length: 5 },
    (_, i) => from + ((to - from) * i) / 4
  )
  const x = (i: number) =>
    left + (i / Math.max(values.length - 1, 1)) * (W - left - right)
  const y = (v: number) =>
    top + (1 - (v - from) / (to - from)) * (H - top - bottom)
  const line = values
    .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ")
  const iLow = values.indexOf(low)
  const iHigh = values.indexOf(high)
  const last = values.length - 1
  const days = [last, Math.round(last / 2), 0]

  return (
    <figure className="space-y-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={t("farmerApp.prices.trendLabel", {
          low: money(low),
          high: money(high),
          today: money(values[last]),
        })}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={left}
              x2={W - right}
              y1={y(v)}
              y2={y(v)}
              className="stroke-border"
              strokeDasharray={v === from ? undefined : "3 4"}
            />
            <text
              x={left - 6}
              y={y(v) + 3.5}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              {v.toFixed(2)}
            </text>
          </g>
        ))}
        {days.map((ago, k) => (
          <text
            key={ago}
            x={x(last - ago)}
            y={H - 6}
            textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}
            className="fill-muted-foreground text-[10px]"
          >
            {ago === 0
              ? t("farmerApp.prices.today")
              : t("farmerApp.prices.daysAgo", { count: ago })}
          </text>
        ))}
        <polygon
          points={`${x(0)},${y(from)} ${line} ${x(last)},${y(from)}`}
          className="fill-secondary"
        />
        <polyline
          points={line}
          fill="none"
          className="stroke-primary"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {[
          [iHigh, high, -8],
          [iLow, low, 14],
        ].map(([i, v, dy]) => (
          <g key={`${i}-${dy}`}>
            <circle
              cx={x(i)}
              cy={y(v)}
              r={3}
              className="fill-card stroke-primary"
              strokeWidth={2}
            />
            <text
              x={Math.min(Math.max(x(i), left + 16), W - right - 16)}
              y={y(v) + dy}
              textAnchor="middle"
              className="fill-foreground text-[10px] font-medium"
            >
              {v.toFixed(2)}
            </text>
          </g>
        ))}
        <circle
          cx={x(last)}
          cy={y(values[last])}
          r={4.5}
          className="fill-primary"
        />
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{t("farmerApp.prices.axis")}</span>
        <span>{t("farmerApp.prices.high", { price: money(high) })}</span>
        <span>{t("farmerApp.prices.low", { price: money(low) })}</span>
      </figcaption>
    </figure>
  )
}
