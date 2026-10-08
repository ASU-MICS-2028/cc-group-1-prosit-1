import { db, type LocalFarmer } from "@/db/local"
import { getAreaUnit } from "@/lib/country"
import { toE164 } from "@/lib/phone"
import { emptyRegistration, type Registration } from "./schema"

/** The saved draft, or a fresh form (farm size in the unit chosen in Country and money). */
export async function loadDraft(): Promise<{
  data: Registration
  step: number
}> {
  const draft = await db.drafts.get("registration")
  return draft
    ? { data: { ...emptyRegistration, ...draft.data }, step: draft.step }
    : { data: { ...emptyRegistration, farmSizeUnit: getAreaUnit() }, step: 1 }
}

export async function saveDraft(data: Registration, step: number) {
  await db.drafts.put({
    id: "registration",
    data,
    step,
    updatedAt: new Date().toISOString(),
  })
}

export async function discardDraft() {
  const draft = await db.drafts.get("registration")
  await db.transaction("rw", db.drafts, db.photos, async () => {
    if (draft?.data.photoId) await db.photos.delete(draft.data.photoId)
    await db.drafts.delete("registration")
  })
}

/** Farmers already on this phone with the same number (families often share one phone). */
export async function farmersWithPhone(phone: string): Promise<LocalFarmer[]> {
  const e164 = toE164(phone)
  if (!e164) return []
  return db.farmers.where("phoneE164").equals(e164).toArray()
}

/**
 * Save: the farmer and its "to send" note in one transaction, so a farmer is never saved
 * without being queued for sync (or queued without being saved). Returns the new farmer.
 */
export async function saveFarmer(
  data: Registration,
  { officerId, language }: { officerId: string; language: string }
): Promise<LocalFarmer> {
  const now = new Date().toISOString()
  const { phone, ...rest } = data
  const farmer: LocalFarmer = {
    ...rest,
    id: crypto.randomUUID(),
    phoneE164: data.hasNoPhone ? null : toE164(phone),
    language,
    consentAt: now,
    registeredById: officerId,
    createdAt: now,
    clientUpdatedAt: now,
    syncStatus: "waiting",
  }

  await db.transaction(
    "rw",
    [db.farmers, db.outbox, db.photos, db.drafts],
    async () => {
      await db.farmers.add(farmer)
      await db.outbox.add({
        kind: "farmer",
        recordId: farmer.id,
        createdAt: now,
        attempts: 0,
      })
      if (farmer.photoId)
        await db.photos.update(farmer.photoId, { farmerId: farmer.id })
      await db.drafts.delete("registration")
    }
  )
  return farmer
}
