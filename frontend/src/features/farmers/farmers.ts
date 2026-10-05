import { SYNC_STATUSES, type SyncStatus } from "@/lib/syncStatus"

/** What the lists show about a farmer. The full profile is added with the registration form. */
export interface FarmerSummary {
  id: string
  name: string
  village: string
  /** E.164, for example "+233240001234" */
  phone: string
  status: SyncStatus
}

const NONE: FarmerSummary[] = []

/** The farmers saved on this phone. Reads from the local database once the offline store exists. */
export function useFarmers(): FarmerSummary[] {
  return NONE
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
    if (digits.length === 0) return false
    // People type a number as "024…" or "+233 24…"; both must find "+233240001234".
    const international = farmer.phone.replace(/\D/g, "")
    const local = "0" + international.replace(/^233/, "")
    return international.includes(digits) || local.includes(digits)
  })
}
