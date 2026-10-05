/** Where a saved record is on its way to the server. */
export type SyncStatus = "waiting" | "synced" | "failed"

export const SYNC_STATUSES: readonly SyncStatus[] = [
  "waiting",
  "synced",
  "failed",
]
