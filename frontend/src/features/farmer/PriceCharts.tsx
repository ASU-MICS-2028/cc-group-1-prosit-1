import { TrendingDown, TrendingUp } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

/** "+4%" in green with an arrow up, "-2%" in red with an arrow down. */
export function Change({ percent }: { percent: number }) {
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
export function PriceTrend({
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
