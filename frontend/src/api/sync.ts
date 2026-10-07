import type { components } from "./schema"
import { api } from "./client"

type S = components["schemas"]
export type SyncRequest = S["SyncRequest"]
export type SyncResult = S["SyncResult"]
export type SyncOutcome = S["SyncOutcome"]

/**
 * Sends saved records to the server (SyncService, ADR 0032). One answer per record; a record with no
 * answer stays queued on the phone.
 */
export const postSync = (body: SyncRequest) =>
  api<S["SyncResponse"]>("/api/sync", { method: "POST", body })
