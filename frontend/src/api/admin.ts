import type { components } from "./schema"
import { api } from "./client"

type S = components["schemas"]
export type AdminOverview = S["AdminOverview"]
export type OfficerSummary = S["OfficerSummary"]

/** The MoFA admin's area: totals and one line per extension officer (AdminService, ADR 0024). */
export const getAdminOverview = () => api<AdminOverview>("/api/admin/overview")
