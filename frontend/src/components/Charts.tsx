import type { ReactNode } from "react"
import { niceTicks } from "@/lib/niceTicks"
import { cn } from "@/lib/utils"

// Small charts without a chart library (no extra download on 2G): plain HTML and CSS.
// Each chart draws an axis with its unit, light gridlines and the value on every bar, and has a
// hidden table with the same numbers for screen readers. Bars are one hue, the brand green.

const percent = (value: number, top: number) => `${(value / top) * 100}%`

/**
 * A table only screen readers see: the chart's numbers, in words. The hiding is on a wrapper: a table
 * never shrinks below its content, so a hidden table on its own would still widen the page.
 */
function DataTable({
  caption,
  head,
  rows,
}: {
  caption: string
  head: string[]
  rows: ReactNode[][]
}) {
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i}>
              {cells.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={j}>{cell}</td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Upright bars, one per period (weeks, months): y axis with its unit and gridlines, the value above
 * each bar, the period under it.
 */
export function ColumnChart({
  title,
  unit,
  items,
  itemHeader,
  format,
  short = format,
  className,
}: {
  /** What the chart shows; also the hidden table's caption */
  title: string
  /** The y axis unit, e.g. "GH₵" */
  unit: string
  items: { label: string; value: number }[]
  /** The table's name for the items, e.g. "Week" */
  itemHeader: string
  /** A value in full, for the table and the hover text ("GH₵ 15,800") */
  format: (value: number) => string
  /** A value as written above its bar and on the axis ("15.8k") */
  short?: (value: number) => string
  className?: string
}) {
  const ticks = niceTicks(Math.max(...items.map((i) => i.value)))
  const top = ticks[ticks.length - 1]

  return (
    <figure className={cn("space-y-2", className)}>
      <div aria-hidden="true">
        <p className="mb-3 text-xs font-medium text-muted-foreground">{unit}</p>
        <div className="flex gap-2">
          {/* y axis: tick labels at their gridlines */}
          <div className="relative h-44 w-10 shrink-0">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute right-0 translate-y-1/2 text-xs text-muted-foreground tabular-nums"
                style={{ bottom: percent(tick, top) }}
              >
                {short(tick)}
              </span>
            ))}
          </div>
          <div className="relative h-44 flex-1 border-b border-foreground/30">
            {ticks.slice(1).map((tick) => (
              <span
                key={tick}
                className="absolute inset-x-0 border-t border-border"
                style={{ bottom: percent(tick, top) }}
              />
            ))}
            <ul className="absolute inset-0 flex items-end gap-3 px-2">
              {items.map((item) => (
                <li
                  key={item.label}
                  title={`${item.label}: ${format(item.value)}`}
                  className="relative flex h-full flex-1 items-end justify-center"
                >
                  <span
                    className="relative w-full max-w-14 rounded-t-[4px] bg-primary"
                    style={{ height: percent(item.value, top) }}
                  >
                    <span className="absolute inset-x-0 -top-5 text-center text-xs font-medium whitespace-nowrap text-foreground tabular-nums">
                      {short(item.value)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {/* x axis: the periods */}
        <ul className="ml-12 flex gap-3 px-2 pt-1.5">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex-1 text-center text-xs text-muted-foreground"
            >
              {item.label}
            </li>
          ))}
        </ul>
      </div>
      <DataTable
        caption={title}
        head={[itemHeader, unit]}
        rows={items.map((i) => [i.label, format(i.value)])}
      />
    </figure>
  )
}

/**
 * A range per row (e.g. the harvest per crop): a solid bar up to the low value and a lighter one up to
 * the high value, on a shared x axis with its unit. A legend names the two parts.
 */
export function RangeChart({
  title,
  unit,
  rows,
  lowLabel,
  highLabel,
  rowHeader,
  noteHeader,
  format,
  className,
}: {
  title: string
  /** The x axis unit, e.g. "Bags of 100 kg" */
  unit: string
  /** label: the row name; note: a short extra line under it (e.g. "Ready in September") */
  rows: { label: string; note?: string; low: number; high: number }[]
  /** Legend names of the two parts, e.g. "At least" and "Could reach" */
  lowLabel: string
  highLabel: string
  /** The table's names for the rows and their notes, e.g. "Crop" and "When" */
  rowHeader: string
  noteHeader: string
  /** The range as written beside the bar, e.g. "6 to 10" */
  format: (low: number, high: number) => string
  className?: string
}) {
  const ticks = niceTicks(Math.max(...rows.map((r) => r.high)))
  const top = ticks[ticks.length - 1]

  return (
    <figure className={cn("space-y-3", className)}>
      <div aria-hidden="true" className="space-y-3">
        <ul className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] bg-primary" />
            {lowLabel}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] border border-primary bg-primary/25" />
            {highLabel}
          </li>
        </ul>
        <div className="relative">
          {/* vertical gridlines behind the bars */}
          <div className="pointer-events-none absolute inset-0">
            {ticks.map((tick) => (
              <span
                key={tick}
                className={cn(
                  "absolute inset-y-0 border-l",
                  tick === 0 ? "border-foreground/30" : "border-border"
                )}
                style={{ left: percent(tick, top) }}
              />
            ))}
          </div>
          <ul className="relative space-y-4 py-1">
            {rows.map((row) => (
              <li
                key={row.label}
                title={`${row.label}: ${format(row.low, row.high)}`}
                className="space-y-1"
              >
                <p className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-foreground">
                    {row.label}
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {format(row.low, row.high)}
                  </span>
                </p>
                <div className="relative h-5">
                  <span
                    className="absolute inset-y-0 left-0 rounded-r-[4px] border border-primary bg-primary/25"
                    style={{ width: percent(row.high, top) }}
                  />
                  <span
                    className="absolute inset-y-0 left-0 rounded-r-[4px] bg-primary"
                    style={{ width: percent(row.low, top) }}
                  />
                </div>
                {row.note && (
                  <p className="text-xs text-muted-foreground">{row.note}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
        {/* x axis: tick values and the unit */}
        <div className="relative h-4">
          {ticks.map((tick, i) => (
            <span
              key={tick}
              className={cn(
                "absolute text-xs text-muted-foreground tabular-nums",
                i === 0
                  ? ""
                  : i === ticks.length - 1
                    ? "-translate-x-full"
                    : "-translate-x-1/2"
              )}
              style={{ left: percent(tick, top) }}
            >
              {tick}
            </span>
          ))}
        </div>
        <p className="text-center text-xs font-medium text-muted-foreground">
          {unit}
        </p>
      </div>
      <DataTable
        caption={title}
        head={[rowHeader, lowLabel, highLabel, noteHeader]}
        rows={rows.map((r) => [r.label, r.low, r.high, r.note ?? ""])}
      />
    </figure>
  )
}
