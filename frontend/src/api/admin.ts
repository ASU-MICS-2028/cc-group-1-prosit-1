import type { components } from "./schema"
import { api } from "./client"

type S = components["schemas"]
export type AdminOverview = S["AdminOverview"]
export type OfficerSummary = S["OfficerSummary"]

/** The MoFA admin's area: totals and one line per extension officer (AdminService, ADR 0024). */
export const getAdminOverview = () => api<AdminOverview>("/api/admin/overview")

export type AddPersonRequest = S["AddPersonRequest"]
export type InviteOutcome = S["SmsOutcome"]

/** Adds an officer or admin in the admin's area and texts them an invite; `invite` says if the SMS went. */
export const addPerson = (body: AddPersonRequest) =>
  api<S["AddPersonResponse"]>("/api/admin/people", { method: "POST", body })
