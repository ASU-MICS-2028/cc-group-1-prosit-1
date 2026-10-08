import { afterEach, describe, expect, it, vi } from "vitest"
import { db, type LocalVisit } from "@/db/local"
import { fakeServer, json, seedFarmer } from "@/test/fakes"
import { BATCH_SIZE, syncNow } from "./sync"

afterEach(() => vi.unstubAllGlobals())

type Batch = { farmers: { id: string }[]; visits: { id: string }[] }

async function queueVisit(farmerId: string): Promise<LocalVisit> {
  const at = new Date().toISOString()
  const visit: LocalVisit = {
    id: "00000000-0000-4000-9000-000000000001",
    farmerId,
    officerId: "officer",
    status: "done",
    scheduledFor: at.slice(0, 10),
    completedAt: at,
    topics: ["pests"],
    observations: [],
    notes: null,
    photoIds: [],
    nextVisit: null,
    createdAt: at,
    clientUpdatedAt: at,
    syncStatus: "waiting",
  }
  await db.visits.add(visit)
  await db.outbox.add({
    kind: "visit",
    recordId: visit.id,
    createdAt: at,
    attempts: 0,
  })
  return visit
}

describe("syncNow", () => {
  it("sends a long queue in batches and keeps what the server did not answer", async () => {
    // The visit is queued first, for a farmer the server does not have yet: it gets no answer.
    const visit = await queueVisit("00000000-0000-4000-8000-ffffffffffff")
    const first = await seedFarmer()
    const others = Array.from({ length: BATCH_SIZE - 1 }, (_, i) => ({
      ...first,
      id: `00000000-0000-4000-8000-1${String(i).padStart(11, "0")}`,
    }))
    await db.farmers.bulkAdd(others)
    await db.outbox.bulkAdd(
      others.map((f) => ({
        kind: "farmer" as const,
        recordId: f.id,
        createdAt: f.createdAt,
        attempts: 0,
      }))
    )
    let visitAnswered = false
    const fetchMock = fakeServer({
      "POST /api/sync": (body) => {
        const batch = body as Batch
        return json(200, {
          results: [
            ...batch.farmers.map((f) => ({ id: f.id, outcome: "created" })),
            ...(visitAnswered
              ? batch.visits.map((v) => ({ id: v.id, outcome: "created" }))
              : []),
          ],
        })
      },
    })

    expect(await syncNow()).toBe(BATCH_SIZE)

    const sizes = fetchMock.mock.calls.map(([, init]) => {
      const batch = JSON.parse(String(init!.body)) as Batch
      return batch.farmers.length + batch.visits.length
    })
    expect(sizes).toEqual([BATCH_SIZE, 1])
    expect(await db.farmers.where("syncStatus").equals("synced").count()).toBe(
      BATCH_SIZE
    )
    expect((await db.outbox.toArray()).map((e) => e.recordId)).toEqual([
      visit.id,
    ])

    visitAnswered = true
    expect(await syncNow()).toBe(1)
    expect(await db.outbox.count()).toBe(0)
    expect((await db.visits.get(visit.id))!.syncStatus).toBe("synced")
  })

  it("sends the farmer's language and nothing only the phone needs", async () => {
    await seedFarmer({ language: "tw", syncProblem: "old problem" })
    const fetchMock = fakeServer({
      "POST /api/sync": () => json(200, { results: [] }),
    })

    expect(await syncNow()).toBe(0)

    const sent = JSON.parse(String(fetchMock.mock.calls[0][1]!.body))
    expect(sent.farmers[0].language).toBe("tw")
    expect(sent.farmers[0]).not.toHaveProperty("syncProblem")
    expect(await db.outbox.count()).toBe(1)
  })
})
