import type { components } from "./schema"
import { api, BASE } from "./client"
import { getSession } from "@/auth/session"

type S = components["schemas"]
export type HelpRequestInfo = S["HelpRequestInfo"]
export type HelpCategory = S["HelpCategory"]
export type HelpStatus = S["HelpStatus"]
export type RequestItem = S["RequestItem"]
export type OfficerRequests = S["OfficerRequests"]
export type HelpDesk = S["HelpDesk"]
export type AskRequest = S["AskRequest"]

// Farmers' questions to their officer, the officer's Requests and the admin's Help desk (HelpService, ADR 0035).

export const askForHelp = (body: AskRequest) =>
  api<HelpRequestInfo>("/api/help/requests", { method: "POST", body })

export const getMyHelpRequests = () =>
  api<HelpRequestInfo[]>("/api/help/requests")

export const giveHelpFeedback = (id: string, helped: boolean) =>
  api<HelpRequestInfo>(`/api/help/requests/${id}/feedback`, {
    method: "POST",
    body: { helped },
  })

export const getOfficerRequests = () =>
  api<OfficerRequests>("/api/officer/requests")

export const answerHelpRequest = (id: string, advice: string) =>
  api<RequestItem>(`/api/officer/requests/${id}/answer`, {
    method: "POST",
    body: { advice },
  })

export const getHelpDesk = () => api<HelpDesk>("/api/admin/help-desk")

export const reassignHelpRequest = (id: string, officerId: string) =>
  api<RequestItem>(`/api/admin/help-desk/${id}/reassign`, {
    method: "POST",
    body: { officerId },
  })

export const remindOfficer = (id: string) =>
  api<RequestItem>(`/api/admin/help-desk/${id}/remind`, { method: "POST" })

/**
 * The voice note as a playable blob URL. Fetched with the sign-in token (an <audio> tag cannot send it).
 * The caller revokes the URL when done.
 */
export async function voiceNoteUrl(id: string): Promise<string | null> {
  const token = getSession()?.token
  try {
    const response = await fetch(`${BASE}/api/help/requests/${id}/voice`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    return response.ok ? URL.createObjectURL(await response.blob()) : null
  } catch {
    return null
  }
}
