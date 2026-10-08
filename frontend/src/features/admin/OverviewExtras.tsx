import "leaflet/dist/leaflet.css"
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet"
import { useTranslation } from "react-i18next"
import { SampleBadge } from "@/components/Flow"
import { cedis } from "@/features/sample/data"
import { niceTicks } from "@/lib/niceTicks"
import { cn } from "@/lib/utils"
import {
  business,
  districtMap,
  monthlyRegistrations,
  type DistrictHealth,
} from "./sample"

// The Overview's sample sections: where farmers are, how registration is going against the plan, and
// the money and reach figures. Labelled "Sample data" until AdminService reports them.

const healthColour: Record<DistrictHealth, string> = {
  good: "#007e2f",
  late: "#c27803",
  noOfficer: "#d92d20",
}

function SectionHead({ id, title }: { id: string; title: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="text-base font-medium text-foreground">
        {title}
      </h2>
      <SampleBadge />
    </div>
  )
}

/** Farmers on the map: one circle per district, sized by farmers, coloured by how well it is covered. */
export function RegionMap() {
  const { t } = useTranslation()
  const most = Math.max(...districtMap.map((d) => d.farmers))
  const ordered = [...districtMap].sort((a, b) => b.farmers - a.farmers)

  return (
    <section
      aria-labelledby="admin-map"
      className="space-y-4 rounded-[20px] border bg-card p-5"
    >
      <SectionHead id="admin-map" title={t("adminOverview.mapTitle")} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="isolate h-105 overflow-hidden rounded-2xl border">
          <MapContainer
            center={[9.6, -0.55]}
            zoom={9}
            scrollWheelZoom={false}
            className="size-full"
            aria-label={t("adminOverview.mapLabel")}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {districtMap.map((d) => (
              <CircleMarker
                key={d.name}
                center={[d.lat, d.lng]}
                radius={8 + 22 * Math.sqrt(d.farmers / most)}
                pathOptions={{
                  color: healthColour[d.health],
                  fillColor: healthColour[d.health],
                  fillOpacity: 0.35,
                  weight: 2,
                }}
              >
                <Tooltip direction="top">
                  <strong>{d.name}</strong>
                  <br />
                  {t("adminOverview.tooltip", {
                    farmers: d.farmers,
                    officers: d.officers,
                    women: d.women,
                  })}
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
        <div className="space-y-3">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {(Object.keys(healthColour) as DistrictHealth[]).map((h) => (
              <li key={h} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ background: healthColour[h] }}
                />
                {t(`adminOverview.health.${h}`)}
              </li>
            ))}
          </ul>
          <ul className="divide-y">
            {ordered.map((d) => (
              <li key={d.name} className="flex items-center gap-3 py-2.5">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: healthColour[d.health] }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {d.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {d.officers === 0
                      ? t("adminOverview.noOfficer")
                      : t("adminOverview.districtLine", {
                          count: d.officers,
                          sync: d.lastSync,
                        })}
                  </span>
                </span>
                <span className="text-sm font-medium text-foreground tabular-nums">
                  {d.farmers}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/** Registrations by month against the plan: axis, gridlines, the value on each bar, the plan as a line. */
export function RegistrationsChart() {
  const { t } = useTranslation()
  const data = monthlyRegistrations
  const ticks = niceTicks(
    Math.max(...data.flatMap((m) => [m.farmers, m.target]))
  )
  const top = ticks[ticks.length - 1]
  const W = 560
  const H = 240
  const left = 40
  const bottom = 26
  const plotW = W - left - 8
  const plotH = H - bottom - 18
  const slot = plotW / data.length
  const y = (v: number) => 18 + plotH - (v / top) * plotH
  const total = data.reduce((s, m) => s + m.farmers, 0)

  return (
    <section
      aria-labelledby="admin-trend"
      className="space-y-3 rounded-[20px] border bg-card p-5"
    >
      <SectionHead id="admin-trend" title={t("adminOverview.trendTitle")} />
      <p className="text-sm text-muted-foreground">
        {t("adminOverview.trendSummary", {
          total: total.toLocaleString("en-GH"),
        })}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={data
          .map((m) =>
            t("adminOverview.trendPoint", {
              month: m.month,
              farmers: m.farmers,
              target: m.target,
            })
          )
          .join("; ")}
        className="w-full"
      >
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1={left}
              x2={W - 8}
              y1={y(v)}
              y2={y(v)}
              className="stroke-border"
              strokeDasharray={v === 0 ? undefined : "3 4"}
            />
            <text
              x={left - 8}
              y={y(v) + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[11px]"
            >
              {v}
            </text>
          </g>
        ))}
        {data.map((m, i) => {
          const x = left + i * slot + slot * 0.2
          const w = slot * 0.6
          const met = m.farmers >= m.target
          return (
            <g key={m.month}>
              <rect
                x={x}
                y={y(m.farmers)}
                width={w}
                height={y(0) - y(m.farmers)}
                rx={6}
                className={met ? "fill-primary" : "fill-primary/45"}
              />
              <text
                x={x + w / 2}
                y={y(m.farmers) - 6}
                textAnchor="middle"
                className="fill-foreground text-[11px] font-medium"
              >
                {m.farmers}
              </text>
              <text
                x={x + w / 2}
                y={H - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {m.month}
              </text>
            </g>
          )
        })}
        <polyline
          fill="none"
          className="stroke-warning"
          strokeWidth={2}
          strokeDasharray="6 4"
          points={data
            .map((m, i) => `${left + i * slot + slot / 2},${y(m.target)}`)
            .join(" ")}
        />
      </svg>
      <ul className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-primary" />
          {t("adminOverview.legendMet")}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-primary/45" />
          {t("adminOverview.legendBelow")}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 bg-warning" />
          {t("adminOverview.legendPlan")}
        </li>
      </ul>
    </section>
  )
}

/** Money through the platform and reach (Phase 2 services). */
export function BusinessTiles() {
  const { t } = useTranslation()
  const b = business
  const tiles = [
    [cedis(b.paidToDealers), t("adminOverview.paidToDealers"), "bg-secondary"],
    [
      cedis(b.loansOut),
      t("adminOverview.loansOut", { percent: b.repaymentPercent }),
      "bg-secondary",
    ],
    [String(b.insuredFarmers), t("adminOverview.insured"), "bg-cream"],
    [`+${cedis(b.coopPriceGain)}/kg`, t("adminOverview.coopGain"), "bg-cream"],
    [`1 : ${b.farmersPerOfficer}`, t("adminOverview.ratio"), "bg-card border"],
    [`${b.activeLast30}%`, t("adminOverview.active"), "bg-card border"],
  ] as const

  return (
    <section aria-labelledby="admin-business" className="space-y-3">
      <SectionHead
        id="admin-business"
        title={t("adminOverview.businessTitle")}
      />
      <div>
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {tiles.map(([value, label, tone]) => (
            <li
              key={label}
              className={cn("space-y-1 rounded-[20px] p-4", tone)}
            >
              <p className="text-xl font-semibold text-foreground tabular-nums">
                {value}
              </p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** How farmers reach AgroConnect. */
export function Channels() {
  const { t } = useTranslation()
  const b = business
  return (
    <section
      aria-labelledby="admin-channels"
      className="space-y-3 rounded-[20px] border bg-card p-5"
    >
      <SectionHead id="admin-channels" title={t("adminOverview.channels")} />
      <ul className="space-y-2.5">
        {b.channels.map((c) => (
          <li key={c.name} className="space-y-1 text-sm">
            <span className="flex justify-between text-foreground">
              {c.name}
              <span className="text-muted-foreground tabular-nums">
                {c.percent}%
              </span>
            </span>
            <span
              role="meter"
              aria-label={c.name}
              aria-valuenow={c.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="block h-2.5 overflow-hidden rounded-full bg-secondary"
            >
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${c.percent}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
