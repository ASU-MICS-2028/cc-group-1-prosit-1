import { useLiveQuery } from "dexie-react-hooks"
import { db, type LocalFarmer } from "@/db/local"
import { SYNC_STATUSES, type SyncStatus } from "@/lib/syncStatus"

/** What the lists show about a farmer. */
export interface FarmerSummary {
  id: string
  name: string
  village: string
  /** E.164, for example "+233240001234"; null when the farmer has no phone */
  phone: string | null
  status: SyncStatus
  /** When it was registered (ISO) */
  createdAt?: string
  /** Last change on this phone (ISO) */
  updatedAt?: string
  /** Why the server refused it, for "To fix" */
  problem?: string | null
}

const NONE: FarmerSummary[] = []

export function toSummary(farmer: LocalFarmer): FarmerSummary {
  return {
    id: farmer.id,
    name: farmer.fullName,
    village: farmer.community,
    phone: farmer.phoneE164,
    status: farmer.syncStatus,
    createdAt: farmer.createdAt,
    updatedAt: farmer.clientUpdatedAt,
    problem: farmer.syncProblem ?? null,
  }
}

/** One farmer with every answer; undefined while loading, null when not on this phone. */
export function useFarmer(
  id: string | undefined
): LocalFarmer | null | undefined {
  return useLiveQuery(
    async () => (id ? ((await db.farmers.get(id)) ?? null) : null),
    [id]
  )
}

/** The half-filled registration, if one was left ("Continue where you stopped"). */
export function useDraft() {
  return useLiveQuery(() => db.drafts.get("registration"))
}

/**
 * The farmers saved on this phone, newest change first. Live: a farmer saved or synced
 * shows up in every list straight away. Empty while the database is opening.
 */
export function useFarmers(): FarmerSummary[] {
  return (
    useLiveQuery(async () => {
      const farmers = await db.farmers
        .orderBy("clientUpdatedAt")
        .reverse()
        .toArray()
      return farmers.map(toSummary)
    }) ?? NONE
  )
}

export function countByStatus(
  farmers: readonly FarmerSummary[]
): Record<SyncStatus, number> {
  const counts = Object.fromEntries(
    SYNC_STATUSES.map((status) => [status, 0])
  ) as Record<SyncStatus, number>
  for (const farmer of farmers) counts[farmer.status] += 1
  return counts
}

/** Search by name or phone digits, optionally limited to one sync status. */
export function filterFarmers(
  farmers: readonly FarmerSummary[],
  query: string,
  status: SyncStatus | "all"
): FarmerSummary[] {
  const text = query.trim().toLowerCase()
  const digits = text.replace(/\D/g, "")
  return farmers.filter((farmer) => {
    if (status !== "all" && farmer.status !== status) return false
    if (!text) return true
    if (farmer.name.toLowerCase().includes(text)) return true
    if (digits.length === 0 || !farmer.phone) return false
    // People type a number as "024…" or "+233 24…"; both must find "+233240001234".
    const international = farmer.phone.replace(/\D/g, "")
    const local = "0" + international.replace(/^233/, "")
    return international.includes(digits) || local.includes(digits)
  })
}
