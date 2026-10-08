import { Link } from "react-router-dom"
import { SyncIcon } from "@/components/SyncStatus"
import { initials } from "@/lib/phone"
import { cn } from "@/lib/utils"
import type { FarmerSummary } from "./farmers"
import { useFarmerDetail } from "./useFarmerDetail"

/** The farmer's initials in a circle (Figma "Avatar"). */
export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-medium",
        size === "sm" && "size-8 bg-secondary text-sm text-primary",
        size === "md" && "size-12 bg-secondary text-base text-primary",
        size === "lg" && "size-18 bg-primary text-xl text-primary-foreground",
        className
      )}
    >
      {initials(name)}
    </span>
  )
}

/** One farmer in a list (Figma "Farmer Row"): initials, name, one detail line, and the sync state. */
export function FarmerRow({
  farmer,
  detail,
  className,
}: {
  farmer: FarmerSummary
  /** Replaces the usual second line, e.g. "Saved today 09:02" on the Sync page */
  detail?: string
  className?: string
}) {
  const line = useFarmerDetail(farmer)

  return (
    <Link
      to={`/farmers/${farmer.id}`}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card py-3 pr-3.5 pl-3 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
    >
      <Avatar name={farmer.name} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-medium text-foreground">
          {farmer.name}
        </span>
        <span
          className={cn(
            "block truncate text-sm",
            farmer.status === "failed" && !detail
              ? "text-destructive"
              : "text-muted-foreground"
          )}
        >
          {detail ?? line}
        </span>
      </span>
      <SyncIcon status={farmer.status} />
    </Link>
  )
}
