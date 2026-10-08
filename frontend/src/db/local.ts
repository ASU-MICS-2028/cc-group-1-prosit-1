import Dexie, { type EntityTable } from "dexie"
import type { Registration } from "@/features/registration/schema"
import type { SyncStatus } from "@/lib/syncStatus"
import type {
  FarmObservation,
  NextVisit,
  VisitTopic,
} from "@/features/visits/options"

/**
 * A farmer as kept on this phone. The fields match the server's farmers table (docs/data-dictionary.md);
 * the ID is made here, so sending the record twice can never create a copy (ADR 0005).
 */
export interface LocalFarmer extends Omit<Registration, "phone"> {
  id: string
  /** "+233240001234", or null when the farmer has no phone */
  phoneE164: string | null
  /** The language the app was in when consent was given */
  language: string
  consentAt: string
  registeredById: string
  createdAt: string
  /** When it last changed on this phone; the newest change wins on sync */
  clientUpdatedAt: string
  syncStatus: SyncStatus
  /** Why the server refused it ("failed"), in the officer's language; shown as "To fix" */
  syncProblem?: string | null
}

/** A compressed farm photo, waiting to be uploaded. */
export interface LocalPhoto {
  id: string
  farmerId: string | null
  blob: Blob
  contentType: string
  sizeBytes: number
  createdAt: string
}

/** A visit an officer logged on this phone. The fields match the server's visits table. */
export interface LocalVisit {
  id: string
  farmerId: string
  officerId: string
  status: "planned" | "done"
  /** The day of the visit, "2026-10-07" */
  scheduledFor: string
  completedAt: string | null
  topics: VisitTopic[]
  observations: FarmObservation[]
  notes: string | null
  photoIds: string[]
  /** When the officer wants to come back, if at all */
  nextVisit: NextVisit | null
  createdAt: string
  clientUpdatedAt: string
  syncStatus: SyncStatus
}

/** One change waiting to be sent to the server. */
export interface OutboxEntry {
  seq?: number
  kind: "farmer" | "visit"
  recordId: string
  createdAt: string
  attempts: number
}

/** The half-filled registration, saved after every answer ("Draft saved"). */
export interface Draft {
  id: "registration"
  data: Registration
  step: number
  updatedAt: string
}

/**
 * The last answer of a server call, kept so the farmer's screens open offline (prices, weather, their farm).
 * `key` is "<user id>:<what>", so two farmers sharing a phone never see each other's data.
 */
export interface CachedAnswer {
  key: string
  data: unknown
  savedAt: string
}

export class LocalDatabase extends Dexie {
  farmers!: EntityTable<LocalFarmer, "id">
  photos!: EntityTable<LocalPhoto, "id">
  outbox!: EntityTable<OutboxEntry, "seq">
  drafts!: EntityTable<Draft, "id">
  visits!: EntityTable<LocalVisit, "id">
  cache!: EntityTable<CachedAnswer, "key">

  constructor() {
    super("agroconnect")
    // Indexed fields only; every other field is stored too. A new version is added for any change.
    this.version(1).stores({
      farmers: "id, phoneE164, syncStatus, clientUpdatedAt",
      photos: "id, farmerId",
      outbox: "++seq, kind, recordId",
      drafts: "id",
    })
    // Version 2: visits logged on this phone
    this.version(2).stores({
      visits: "id, farmerId, scheduledFor, syncStatus",
    })
    // Version 3: the last server answers, for the farmer's screens offline
    this.version(3).stores({
      cache: "key",
    })
  }
}

export const db = new LocalDatabase()
