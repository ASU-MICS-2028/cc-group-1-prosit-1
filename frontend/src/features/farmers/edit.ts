import { db, type LocalFarmer } from "@/db/local"
import type { Registration } from "@/features/registration/schema"
import { toE164 } from "@/lib/phone"

/** The saved farmer as form answers (the phone without +233, as typed in the form). */
export function toAnswers(farmer: LocalFarmer): Registration {
  const {
    id,
    phoneE164,
    language,
    consentAt,
    registeredById,
    createdAt,
    clientUpdatedAt,
    syncStatus,
    syncProblem,
    ...answers
  } = farmer
  void [
    id,
    language,
    consentAt,
    registeredById,
    createdAt,
    clientUpdatedAt,
    syncStatus,
    syncProblem,
  ]
  return {
    ...answers,
    consentGiven: true,
    phone: phoneE164 ? phoneE164.replace(/^\+233/, "") : "",
  }
}

/**
 * Saves changed answers: the farmer goes back to "waiting" with a new change time (the newest change
 * wins on sync) and is queued again unless already in the queue. One transaction, like registering.
 */
export async function updateFarmer(
  id: string,
  answers: Registration
): Promise<void> {
  const now = new Date().toISOString()
  const { phone, consentGiven, ...rest } = answers
  void consentGiven
  await db.transaction("rw", [db.farmers, db.outbox, db.photos], async () => {
    const before = await db.farmers.get(id)
    if (!before) throw new Error("Farmer not found on this device")
    await db.farmers.update(id, {
      ...rest,
      phoneE164: answers.hasNoPhone ? null : toE164(phone),
      clientUpdatedAt: now,
      syncStatus: "waiting",
      syncProblem: null,
    })
    const queued = await db.outbox.where("recordId").equals(id).count()
    if (queued === 0)
      await db.outbox.add({
        kind: "farmer",
        recordId: id,
        createdAt: now,
        attempts: 0,
      })
    if (rest.photoId && rest.photoId !== before.photoId) {
      await db.photos.update(rest.photoId, { farmerId: id })
      if (before.photoId) await db.photos.delete(before.photoId)
    }
  })
}
