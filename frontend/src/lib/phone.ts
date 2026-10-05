/**
 * Shows a Ghana number the way the design does, hiding the middle digits:
 * "+233240001234" becomes "+233 24 ••• 1234". Anything else is fully hidden.
 */
export function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "")
  if (digits.length !== 12 || !digits.startsWith("233")) return "•••"
  return `+233 ${digits.slice(3, 5)} ••• ${digits.slice(8)}`
}

/**
 * The number typed after the +233 box, however it was written ("24 000 0000", "0240000000"),
 * as "+233240000000"; null when it is not a Ghana number (9 digits starting 2, 3 or 5).
 * The server checks again with the same rule.
 */
export function toE164(typed: string): string | null {
  let digits = typed.replace(/\D/g, "")
  if (digits.startsWith("233") && digits.length === 12) digits = digits.slice(3)
  if (digits.startsWith("0")) digits = digits.slice(1)
  return /^[235]\d{8}$/.test(digits) ? `+233${digits}` : null
}

/** "Ama Boateng" becomes "AB"; one name gives one letter. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase()
}
