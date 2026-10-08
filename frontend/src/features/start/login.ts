import type { Role } from "@/auth/session"

/** What the code screen needs from the log-in screen (React Router location state). */
export interface CodeScreenState {
  phone: string
  resendAfterSeconds: number
}

/** The role in the address (/login/officer, /login/farmer, /login/admin); anything else is treated as officer. */
export function roleFrom(param: string | undefined): Role {
  return param === "farmer" || param === "admin" ? param : "officer"
}

/** 45 seconds as "0:45". */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}
