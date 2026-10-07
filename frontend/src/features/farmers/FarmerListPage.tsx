import { Search } from "lucide-react"
import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Facts, OfflineNote } from "@/components/Blocks"
import { SyncBadge } from "@/components/SyncBadge"
import { SyncIcon } from "@/components/SyncStatus"
import { Button, buttonVariants } from "@/components/ui/button"
import { maskPhone } from "@/lib/phone"
import { speak } from "@/lib/speech"
import { SYNC_STATUSES, type SyncStatus } from "@/lib/syncStatus"
import { usePhotoUrl } from "@/lib/usePhotoUrl"
import { useOnline } from "@/lib/useOnline"
import { cn } from "@/lib/utils"
import { farmerFacts, farmerSpeech } from "./describe"
import { Avatar, FarmerRow } from "./FarmerRow"
import {
  countByStatus,
  filterFarmers,
  useFarmer,
  useFarmers,
  type FarmerSummary,
} from "./farmers"
import { formatLongDate } from "@/lib/dates"

function readStatus(value: string | null): SyncStatus | "all" {
  return SYNC_STATUSES.includes(value as SyncStatus)
    ? (value as SyncStatus)
    : "all"
}

/**
 * My farmers (Figma 13 / D16): search, filters by sync state, and the list. Computers get a table
 * and, beside it, a preview of the farmer picked.
 */
export function Component() {
  const { t } = useTranslation()
  const online = useOnline()
  const farmers = useFarmers()
  const counts = countByStatus(farmers)
  const [params, setParams] = useSearchParams()
  // The box keeps its own text (typing must never wait for the address to update);
  // the address follows it, so Back and a reload keep the search.
  const [query, setQuery] = useState(() => params.get("q") ?? "")
  const status = readStatus(params.get("status"))
  const visible = filterFarmers(farmers, query, status)
  const [picked, setPicked] = useState<string | null>(null)
  const preview = visible.find((f) => f.id === picked) ?? visible[0]

  function update(next: { q?: string; status?: SyncStatus | "all" }) {
    if (next.q !== undefined) setQuery(next.q)
    const merged = { q: query, status, ...next }
    const out: Record<string, string> = {}
    if (merged.q) out.q = merged.q
    if (merged.status !== "all") out.status = merged.status
    setParams(out, { replace: true })
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3 md:justify-start">
        <h1 className="text-2xl leading-9 font-semibold text-primary">
          {t("farmers.title")}
        </h1>
        <SyncBadge
          waiting={counts.waiting}
          failed={counts.failed}
          className="md:hidden"
        />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_316px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="flex h-12 items-center gap-2 rounded-full border bg-card px-4 focus-within:ring-3 focus-within:ring-ring/50 md:w-60">
              <Search aria-hidden className="size-5 shrink-0" />
              <span className="sr-only">{t("farmers.search")}</span>
              <input
                type="search"
                value={query}
                onChange={(e) => update({ q: e.target.value })}
                placeholder={t("farmers.search")}
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
            </label>
            <div
              role="group"
              aria-label={t("farmers.filterLabel")}
              className="flex flex-wrap gap-2"
            >
              {(["all", "waiting", "failed", "synced"] as const).map(
                (value) => {
                  const active = status === value
                  const n = value === "all" ? farmers.length : counts[value]
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => update({ status: value })}
                      className={cn(
                        "h-10 rounded-full px-4 text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)]"
                      )}
                    >
                      {t(`farmers.filters.${value}`)} {n}
                    </button>
                  )
                }
              )}
            </div>
          </div>

          {online ? null : <OfflineNote>{t("farmers.offline")}</OfflineNote>}

          {visible.length === 0 ? (
            <div className="space-y-4 rounded-[20px] border border-dashed p-8 text-center">
              <p className="text-muted-foreground">
                {farmers.length === 0
                  ? t("farmers.empty")
                  : t("farmers.noMatch")}
              </p>
            </div>
          ) : (
            <>
              {/* Phones and tablets: rows */}
              <ul className="space-y-3 lg:hidden">
                {visible.map((farmer) => (
                  <li key={farmer.id}>
                    <FarmerRow farmer={farmer} />
                  </li>
                ))}
              </ul>
              {/* Computers: a table; click a row to preview, or open the name */}
              <FarmerTable
                farmers={visible}
                picked={preview?.id}
                onPick={setPicked}
              />
            </>
          )}

          <Link
            to="/register"
            className={cn(buttonVariants({ size: "xl" }), "w-full lg:hidden")}
          >
            {t("farmers.register")}
          </Link>
        </div>

        {preview ? <FarmerPreview id={preview.id} /> : null}
      </div>
    </div>
  )
}

function FarmerTable({
  farmers,
  picked,
  onPick,
}: {
  farmers: FarmerSummary[]
  picked: string | undefined
  onPick: (id: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="hidden overflow-hidden rounded-[20px] border bg-card lg:block">
      <table className="w-full text-left text-sm">
        <thead className="bg-secondary text-primary">
          <tr>
            <th className="px-5 py-3 font-medium">
              {t("farmers.columns.farmer")}
            </th>
            <th className="px-3 py-3 font-medium">
              {t("farmers.columns.community")}
            </th>
            <th className="px-3 py-3 font-medium">
              {t("farmers.columns.phone")}
            </th>
            <th className="px-3 py-3 font-medium">
              {t("farmers.columns.status")}
            </th>
          </tr>
        </thead>
        <tbody>
          {farmers.map((farmer) => (
            <tr
              key={farmer.id}
              onClick={() => onPick(farmer.id)}
              className={cn(
                "cursor-pointer border-t",
                farmer.id === picked ? "bg-cream" : "hover:bg-muted"
              )}
            >
              <td className="px-5 py-3">
                <span className="flex items-center gap-3">
                  <Avatar name={farmer.name} size="sm" />
                  <Link
                    to={`/farmers/${farmer.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-base font-medium text-foreground outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {farmer.name}
                  </Link>
                </span>
              </td>
              <td className="px-3 py-3 text-foreground">{farmer.village}</td>
              <td
                className={cn(
                  "px-3 py-3",
                  farmer.status === "failed"
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {farmer.status === "failed" && farmer.problem
                  ? farmer.problem
                  : farmer.phone
                    ? maskPhone(farmer.phone)
                    : t("register.review.noPhone")}
              </td>
              <td className="px-3 py-3">
                <StatusPill status={farmer.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** "Waiting", "To fix", "Synced" in a coloured pill. */
export function StatusPill({ status }: { status: SyncStatus }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full pr-3 pl-1 text-sm font-medium",
        status === "waiting" && "bg-warning-soft text-warning",
        status === "synced" && "bg-secondary text-primary",
        status === "failed" && "bg-destructive-soft text-destructive"
      )}
    >
      <SyncIcon status={status} className="size-6 bg-transparent" />
      {t(`farmers.filters.${status}`)}
    </span>
  )
}

/** The panel beside the table (D16): photo, the main answers, Listen and Open profile. */
function FarmerPreview({ id }: { id: string }) {
  const { t } = useTranslation()
  const farmer = useFarmer(id)
  const photo = usePhotoUrl(farmer?.photoId)
  if (!farmer) return null
  const f = farmerFacts(farmer, t)

  return (
    <aside className="hidden space-y-4 self-start rounded-[30px] border bg-card p-4 lg:block">
      <div className="flex items-center gap-4 rounded-[20px] bg-cream p-4">
        <Avatar
          name={farmer.fullName}
          size="lg"
          className="size-13 text-base"
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-medium text-foreground">
            {farmer.fullName}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {f.community}
          </p>
          <p
            className={cn(
              "text-sm font-medium",
              farmer.syncStatus === "waiting" && "text-warning",
              farmer.syncStatus === "synced" && "text-primary",
              farmer.syncStatus === "failed" && "text-destructive"
            )}
          >
            {t(`sync.${farmer.syncStatus}Status`)}
          </p>
        </div>
      </div>
      {photo ? (
        <img
          src={photo}
          alt={t("register.location.photoAlt")}
          className="aspect-282/125 w-full rounded-2xl object-cover"
        />
      ) : null}
      <Facts
        rows={[
          [t("farmers.facts.phone"), f.phone],
          [t("farmers.facts.crops"), f.crops],
          [t("farmers.facts.size"), f.size],
          [
            t("farmers.facts.reachBy"),
            [f.reachBy, f.phoneType?.toLowerCase()].filter(Boolean).join(", "),
          ],
          [t("farmers.facts.needs"), f.needs],
          [t("farmers.facts.consent"), formatLongDate(farmer.consentAt)],
        ]}
      />
      <div className="flex gap-3">
        <Button
          size="xl"
          variant="secondary"
          className="flex-1 text-primary"
          onClick={() => speak(farmerSpeech(farmer, t))}
        >
          {t("farmers.listen")}
        </Button>
        <Link
          to={`/farmers/${farmer.id}`}
          className={cn(buttonVariants({ size: "xl" }), "flex-1")}
        >
          {t("farmers.openProfile")}
        </Link>
      </div>
    </aside>
  )
}
