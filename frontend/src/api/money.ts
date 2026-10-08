import type { components } from "./schema"
import { api } from "./client"

type S = components["schemas"]
export type MoneyOverview = S["MoneyOverview"]
export type WalletInfo = S["WalletInfo"]
export type PaymentInfo = S["PaymentInfo"]
export type MobileNetwork = S["MobileNetwork"]
export type PaymentPurpose = S["PaymentPurpose"]

// The farmer's mobile money (MoneyService, ADR 0034). Payments go through Paystack; the farmer approves each
// one on their phone with their PIN, which the app never sees. With no Paystack key the server answers with a
// sample provider and says so (`sample: true`).

export const getMoney = () => api<MoneyOverview>("/api/money")

export const linkWallet = (network: MobileNetwork) =>
  api<WalletInfo>("/api/money/wallet", { method: "PUT", body: { network } })

export const startPayment = (body: S["PayRequest"]) =>
  api<PaymentInfo>("/api/money/payments", { method: "POST", body })

export const getPayment = (reference: string) =>
  api<PaymentInfo>(`/api/money/payments/${encodeURIComponent(reference)}`)

export const sendPaymentCode = (reference: string, code: string) =>
  api<PaymentInfo>(
    `/api/money/payments/${encodeURIComponent(reference)}/code`,
    { method: "POST", body: { code } }
  )
