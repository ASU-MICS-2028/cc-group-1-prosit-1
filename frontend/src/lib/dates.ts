import i18n from "@/i18n"

/** Ghana writes the day first (6 Oct) and uses the 24-hour clock, whatever the app language. */
function locales() {
  return [`${i18n.language}-GH`, "en-GB"]
}

/** "2026-10-07" in the phone's own time zone (not UTC: a visit at 23:30 is still today). */
export function dayKey(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function isToday(iso: string, now: Date = new Date()): boolean {
  return dayKey(new Date(iso)) === dayKey(now)
}

/** "09:02" */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(locales(), {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso))
}

/** "6 October 2026" */
export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat(locales(), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso))
}

/** "6 Oct" */
export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat(locales(), {
    day: "numeric",
    month: "short",
  }).format(new Date(iso))
}

/** Which greeting fits the hour: before 12 morning, before 17 afternoon, then evening. */
export function partOfDay(
  date: Date = new Date()
): "morning" | "afternoon" | "evening" {
  const hour = date.getHours()
  if (hour < 12) return "morning"
  if (hour < 17) return "afternoon"
  return "evening"
}
