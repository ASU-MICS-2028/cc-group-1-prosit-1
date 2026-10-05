import { Link } from "react-router-dom"
import { SyncIcon } from "@/components/SyncStatus"
import type { FarmerSummary } from "./farmers"
import { initials, maskPhone } from "@/lib/phone"

/** One farmer in a list: initials, name, village and masked phone, and the sync state. */
export function FarmerRow({ farmer }: { farmer: FarmerSummary }) {
  return (
    <Link
      to={`/farmers/${farmer.id}`}
      className="flex items-center gap-3 rounded-2xl border bg-card p-3 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary"
      >
        {initials(farmer.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{farmer.name}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {farmer.village} · {maskPhone(farmer.phone)}
        </span>
      </span>
      <SyncIcon status={farmer.status} />
    </Link>
  )
}
