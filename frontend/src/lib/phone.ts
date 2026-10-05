/**
 * Shows a Ghana number the way the design does, hiding the middle digits:
 * "+233240001234" becomes "+233 24 ••• 1234". Anything else is fully hidden.
 */
export function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "")
  if (digits.length !== 12 || !digits.startsWith("233")) return "•••"
  return `+233 ${digits.slice(3, 5)} ••• ${digits.slice(8)}`
}

/** "Ama Boateng" becomes "AB"; one name gives one letter. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (first + last).toUpperCase()
}
