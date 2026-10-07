import { useLiveQuery } from "dexie-react-hooks"
import { db, type LocalFarmer, type LocalVisit } from "@/db/local"
import { dayKey } from "@/lib/dates"
import type { FarmObservation, NextVisit, VisitTopic } from "./options"

export interface VisitAnswers {
  topics: VisitTopic[]
  observations: FarmObservation[]
  notes: string
  photoIds: string[]
  nextVisit: NextVisit | null
}

/**
 * Saves a visit that just happened ("done", today), queued for sync in the same transaction, and
 * links its photos to the farmer. Returns the visit.
 */
export async function saveVisit(
  farmerId: string,
  answers: VisitAnswers,
  officerId: string
): Promise<LocalVisit> {
  const now = new Date().toISOString()
  const visit: LocalVisit = {
    id: crypto.randomUUID(),
    farmerId,
    officerId,
    status: "done",
    scheduledFor: dayKey(),
    completedAt: now,
    topics: answers.topics,
    observations: answers.observations,
    notes: answers.notes.trim() || null,
    photoIds: answers.photoIds,
    nextVisit: answers.nextVisit,
    createdAt: now,
    clientUpdatedAt: now,
    syncStatus: "waiting",
  }
  await db.transaction("rw", [db.visits, db.outbox, db.photos], async () => {
    await db.visits.add(visit)
    await db.outbox.add({
      kind: "visit",
      recordId: visit.id,
      createdAt: now,
      attempts: 0,
    })
    for (const photoId of answers.photoIds)
      await db.photos.update(photoId, { farmerId })
  })
  return visit
}

export interface VisitRow extends LocalVisit {
  farmer: Pick<LocalFarmer, "fullName" | "community"> | null
}

/** Visits on this phone from `from` (a day like "2026-10-07") up to and including `to`, newest first. */
export function useVisits(from: string, to: string): VisitRow[] | undefined {
  return useLiveQuery(async () => {
    const visits = await db.visits
      .where("scheduledFor")
      .between(from, to, true, true)
      .reverse()
      .sortBy("clientUpdatedAt")
    const farmers = await db.farmers.bulkGet([
      ...new Set(visits.map((v) => v.farmerId)),
    ])
    const byId = new Map(farmers.filter(Boolean).map((f) => [f!.id, f!]))
    return visits.map((v) => {
      const f = byId.get(v.farmerId)
      return {
        ...v,
        farmer: f ? { fullName: f.fullName, community: f.community } : null,
      }
    })
  }, [from, to])
}
