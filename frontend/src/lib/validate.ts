import { toE164 } from "./phone"

// Field checks shared by the forms, each returning the translation key of the problem, or null when the
// value is fine. The server checks the same rules again; these only save a round trip and say what to fix.

export type Problem =
  | "validate.required"
  | "validate.phone"
  | "validate.ownPhone"
  | "validate.fullName"
  | "validate.amountMin"
  | "validate.amountMax"
  | "validate.whole"

export function required(value: string): Problem | null {
  return value.trim() === "" ? "validate.required" : null
}

/** A Ghana mobile number, written any common way ("024 000 0000", "+233 24 000 0000"). */
export function ghanaPhone(value: string, own?: string | null): Problem | null {
  if (value.trim() === "") return "validate.required"
  const e164 = toE164(value)
  if (!e164) return "validate.phone"
  if (own && e164 === own) return "validate.ownPhone"
  return null
}

/** At least a first name and a surname, letters only. */
export function fullName(value: string): Problem | null {
  const name = value.trim()
  if (name === "") return "validate.required"
  return /^[\p{L}'’-]+(\s+[\p{L}'’-]+)+$/u.test(name)
    ? null
    : "validate.fullName"
}

/** Whole cedis between min and max (Paystack takes GH₵ 1 to GH₵ 10,000 per payment). */
export function amount(value: string, min = 1, max = 10_000): Problem | null {
  if (value.trim() === "") return "validate.required"
  if (!/^\d+$/.test(value.trim())) return "validate.whole"
  const n = Number(value)
  if (n < min) return "validate.amountMin"
  if (n > max) return "validate.amountMax"
  return null
}
