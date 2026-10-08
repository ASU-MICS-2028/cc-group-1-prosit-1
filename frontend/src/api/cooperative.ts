import type { components } from "./schema"
import { api } from "./client"

type S = components["schemas"]
export type CooperativeDetails = S["CooperativeDetails"]
export type AdminCooperative = S["AdminCooperative"]
export type PaymentInfo = S["PaymentInfo"]

// Cooperatives (CooperativeService, ADR 0040): the farmer's group, savings by mobile money, group orders,
// selling together and meetings; officers run them, admins see their area.

export const getMyCooperative = () =>
  api<CooperativeDetails>("/api/cooperative")

/** Starts a mobile money payment; the savings count once it is paid (approve on the phone). */
export const addSavings = (amount: number) =>
  api<PaymentInfo>("/api/cooperative/savings", {
    method: "POST",
    body: { amount },
  })

export const updateOrder = (id: string, bags: number) =>
  api<void>(`/api/cooperative/orders/${id}`, { method: "PUT", body: { bags } })

export const updateSale = (id: string, bags: number) =>
  api<void>(`/api/cooperative/sales/${id}`, { method: "PUT", body: { bags } })

export const updateRsvp = (id: string, coming: boolean) =>
  api<void>(`/api/cooperative/meetings/${id}/rsvp`, {
    method: "PUT",
    body: { coming },
  })

export const getOfficerCooperatives = () =>
  api<CooperativeDetails[]>("/api/officer/cooperatives")

export const createCooperative = (body: S["CreateCooperativeRequest"]) =>
  api<CooperativeDetails>("/api/officer/cooperatives", { method: "POST", body })

export const addCooperativeMember = (id: string, farmerId: string) =>
  api<void>(`/api/officer/cooperatives/${id}/members`, {
    method: "POST",
    body: { farmerId },
  })

export const createOrder = (id: string, body: S["CreateOrderRequest"]) =>
  api<void>(`/api/officer/cooperatives/${id}/orders`, { method: "POST", body })

export const createSale = (id: string, body: S["CreateSaleRequest"]) =>
  api<void>(`/api/officer/cooperatives/${id}/sales`, { method: "POST", body })

export const createMeeting = (id: string, body: S["CreateMeetingRequest"]) =>
  api<void>(`/api/officer/cooperatives/${id}/meetings`, {
    method: "POST",
    body,
  })

export const getAdminCooperatives = () =>
  api<AdminCooperative[]>("/api/admin/cooperatives")

export const remindPledges = (id: string) =>
  api<S["RemindResult"]>(`/api/admin/cooperatives/${id}/remind-pledges`, {
    method: "POST",
  })
