import { vi } from "vitest"
import { db, type LocalFarmer } from "@/db/local"
import { emptyRegistration } from "@/features/registration/schema"
import { testOfficer } from "./renderRoute"

export function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

/** A fake server: answers by path ("POST /api/sync" or "/api/sync"). Returns the mock to inspect calls. */
export function fakeServer(
  answers: Record<string, (body: unknown) => Response>
) {
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      const answer =
        answers[`${init?.method ?? "GET"} ${path}`] ?? answers[path]
      if (!answer) throw new TypeError(`no network for ${path}`)
      return answer(init?.body ? JSON.parse(String(init.body)) : undefined)
    }
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

let counter = 0

/** A farmer saved on this test "phone" by the test officer, queued for sync like a real one. */
export async function seedFarmer(
  overrides: Partial<LocalFarmer> = {}
): Promise<LocalFarmer> {
  counter += 1
  const { phone, ...answers } = emptyRegistration
  void phone
  const at = overrides.createdAt ?? new Date().toISOString()
  const farmer: LocalFarmer = {
    ...answers,
    id: `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`,
    fullName: "Ama Boateng",
    community: "Tolon",
    regionDistrict: "Northern",
    gender: "female",
    ageBand: "36-50",
    crops: ["maize", "groundnut"],
    farmSize: 2.5,
    soil: "loamy",
    phoneType: "basic_phone",
    reachChannels: ["sms"],
    mobileMoney: "yes",
    helpNeeded: ["seeds", "market_prices"],
    phoneE164: "+233240001234",
    language: "en",
    consentAt: at,
    registeredById: testOfficer.id,
    createdAt: at,
    clientUpdatedAt: at,
    syncStatus: "waiting",
    ...overrides,
  }
  await db.farmers.add(farmer)
  if (farmer.syncStatus === "waiting")
    await db.outbox.add({
      kind: "farmer",
      recordId: farmer.id,
      createdAt: at,
      attempts: 0,
    })
  return farmer
}
