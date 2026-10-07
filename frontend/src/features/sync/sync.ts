import { useSyncExternalStore } from "react"
import { postSync, type SyncRequest, type SyncResult } from "@/api/sync"
import {
  db,
  type LocalFarmer,
  type LocalVisit,
  type OutboxEntry,
} from "@/db/local"

export type { SyncResult }

/** Records per request: small enough to get through on a weak 2G signal. */
export const BATCH_SIZE = 100

const LAST_SYNC_KEY = "agroconnect.lastSyncAt"
const listeners = new Set<() => void>()

function readLastSync(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC_KEY)
  } catch {
    return null
  }
}

/** When this device last sent its records successfully, or null if never. */
export function useLastSync(): string | null {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify)
      return () => listeners.delete(notify)
    },
    readLastSync,
    () => null
  )
}

/** The record as the server receives it: everything except what only this phone needs. */
function farmerForServer({
  syncStatus,
  syncProblem,
  ...farmer
}: LocalFarmer): SyncRequest["farmers"][number] {
  void syncStatus
  void syncProblem
  // The language is one the app offers, so one the server knows.
  return { ...farmer, language: farmer.language as SyncLanguage }
}

type SyncLanguage = SyncRequest["farmers"][number]["language"]

function visitForServer({
  syncStatus,
  nextVisit,
  ...visit
}: LocalVisit): SyncRequest["visits"][number] {
  void syncStatus
  void nextVisit
  return visit
}

let running: Promise<number> | null = null

/**
 * Sends everything in the outbox ("to send" queue) to the server, oldest first, in batches of
 * BATCH_SIZE. Sending twice does no harm: the IDs were made on the phone, so the server updates
 * instead of copying. Records the server accepts become "synced" and leave the queue; records it
 * refuses become "failed" with the reason. Records it does not answer (a visit whose farmer is not on
 * the server yet) stay queued for next time.
 * Throws an ApiError when the server cannot be reached; nothing is lost, the queue stays.
 * Returns how many records the server answered.
 */
export function syncNow(): Promise<number> {
  // One sync at a time: "Sync now" and the automatic sync must not send the same batch twice.
  running ??= send().finally(() => {
    running = null
  })
  return running
}

async function send(): Promise<number> {
  let answered = 0
  let after = 0
  for (;;) {
    // Walk the queue by position, so records left unanswered never block the ones behind them.
    const entries = await db.outbox
      .where("seq")
      .above(after)
      .limit(BATCH_SIZE)
      .toArray()
    if (entries.length === 0) return answered
    answered += await sendBatch(entries)
    after = entries[entries.length - 1].seq!
  }
}

async function sendBatch(entries: OutboxEntry[]): Promise<number> {
  const farmerIds = [
    ...new Set(
      entries.filter((e) => e.kind === "farmer").map((e) => e.recordId)
    ),
  ]
  const visitIds = [
    ...new Set(
      entries.filter((e) => e.kind === "visit").map((e) => e.recordId)
    ),
  ]
  const farmers = (await db.farmers.bulkGet(farmerIds)).filter(
    (f): f is LocalFarmer => f !== undefined
  )
  const visits = (await db.visits.bulkGet(visitIds)).filter(
    (v): v is LocalVisit => v !== undefined
  )

  let results: SyncResult[]
  try {
    ;({ results } = await postSync({
      farmers: farmers.map(farmerForServer),
      visits: visits.map(visitForServer),
    }))
  } catch (error) {
    await db.outbox
      .where("seq")
      .anyOf(entries.map((e) => e.seq!))
      .modify((e) => {
        e.attempts += 1
      })
    throw error
  }

  const byId = new Map(results.map((r) => [r.id, r]))
  await db.transaction("rw", [db.farmers, db.visits, db.outbox], async () => {
    for (const entry of entries) {
      const result = byId.get(entry.recordId)
      if (!result) continue // not answered: stays in the queue for next time
      const accepted =
        result.outcome !== "invalid" && result.outcome !== "forbidden"
      const table = entry.kind === "farmer" ? db.farmers : db.visits
      await table.update(entry.recordId, {
        syncStatus: accepted ? "synced" : "failed",
        ...(entry.kind === "farmer"
          ? { syncProblem: result.problem ?? null }
          : {}),
      })
      await db.outbox.delete(entry.seq!)
    }
  })
  markSynced()
  return results.length
}

function markSynced() {
  try {
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
  } catch {
    // storage blocked: the time is only shown, nothing depends on it
  }
  listeners.forEach((notify) => notify())
}
