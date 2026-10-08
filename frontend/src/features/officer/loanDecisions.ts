import { useSyncExternalStore } from "react"
import {
  loans,
  type LoanApplication,
  type LoanStatus,
} from "@/features/sample/data"

// The officer's approve / decline decisions on the sample loans, kept for this browser session so the
// list, the counts and the decided loan all agree until the loan backend exists (round 2, PR 2).

const KEY = "agroconnect.loanDecisions"
const listeners = new Set<() => void>()
let decisions: Record<string, LoanStatus> = read()

function read(): Record<string, LoanStatus> {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as Record<
      string,
      LoanStatus
    >
  } catch {
    return {}
  }
}

export function decideLoan(id: string, status: Exclude<LoanStatus, "review">) {
  decisions = { ...decisions, [id]: status }
  try {
    sessionStorage.setItem(KEY, JSON.stringify(decisions))
  } catch {
    // storage blocked: the decision lasts until the page closes
  }
  listeners.forEach((notify) => notify())
}

/** The sample loans with the officer's decisions applied. */
export function useLoans(): LoanApplication[] {
  const current = useSyncExternalStore(
    (notify) => {
      listeners.add(notify)
      return () => listeners.delete(notify)
    },
    () => decisions,
    () => decisions
  )
  return loans.map((l) => (current[l.id] ? { ...l, status: current[l.id] } : l))
}
