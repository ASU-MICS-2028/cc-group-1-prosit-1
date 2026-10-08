import i18n from "@/i18n"
import { getSession } from "@/auth/session"

/** In front of the contract's /api/... paths. Empty: same address as the app (see .env.example). */
export const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "")

/**
 * A failed call. `key` is the server's stable message key (e.g. "CODE_WRONG") for code to check;
 * `message` is already in the user's language. No network gives status 0 and key "OFFLINE".
 */
export class ApiError extends Error {
  readonly status: number
  readonly key: string

  constructor(status: number, key: string, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.key = key
  }
}

interface Problem {
  title?: string | null
  detail?: string | null
}

/** Calls the API with JSON, the user's language and (when signed in) their token. */
export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Language": i18n.language,
  }
  if (init.body !== undefined) headers["Content-Type"] = "application/json"
  const token = getSession()?.token
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(BASE + path, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
  } catch {
    throw new ApiError(0, "OFFLINE", i18n.t("errors.offline"))
  }

  if (response.ok) {
    return (response.status === 204 ? undefined : await response.json()) as T
  }

  const problem = (await response.json().catch(() => ({}))) as Problem
  throw new ApiError(
    response.status,
    problem.title ?? `HTTP_${response.status}`,
    problem.detail ?? i18n.t("errors.generic")
  )
}
