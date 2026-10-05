import { afterEach, describe, expect, it, vi } from "vitest"
import i18n from "@/i18n"
import { clearSession, getSession, saveSession } from "@/auth/session"
import { testOfficer } from "@/test/renderRoute"
import { api, ApiError } from "./client"

afterEach(() => {
  vi.unstubAllGlobals()
  clearSession()
})

function respond(status: number, body?: unknown) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(body === undefined ? null : JSON.stringify(body), { status })
    )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

describe("api client", () => {
  it("sends JSON with the user's language and returns the answer", async () => {
    const fetchMock = respond(200, { ok: true })
    await i18n.changeLanguage("tw")

    const answer = await api<{ ok: boolean }>("/api/thing", {
      method: "POST",
      body: { a: 1 },
    })

    expect(answer).toEqual({ ok: true })
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(path).toBe("/api/thing")
    expect(init.method).toBe("POST")
    expect(init.body).toBe('{"a":1}')
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "X-Language": "tw",
    })
    expect(init.headers).not.toHaveProperty("Authorization")
  })

  it("adds the token once signed in", async () => {
    saveSession({
      token: "jwt",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: testOfficer,
    })
    const fetchMock = respond(204)

    await expect(api("/api/me")).resolves.toBeUndefined()
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.headers).toMatchObject({ Authorization: "Bearer jwt" })
  })

  it("turns a problem answer into an error with the key and the translated message", async () => {
    respond(429, { title: "RESEND_TOO_SOON", detail: "Please wait a moment." })

    const error = await api("/api/auth/code").catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 429,
      key: "RESEND_TOO_SOON",
      message: "Please wait a moment.",
    })
  })

  it("still gives a readable error when the server sends no details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("oops", { status: 500 }))
    )

    await expect(api("/api/x")).rejects.toMatchObject({
      status: 500,
      key: "HTTP_500",
      message: "Something went wrong. Please try again.",
    })
  })

  it("reports no network as OFFLINE", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    )

    await expect(api("/api/x")).rejects.toMatchObject({
      status: 0,
      key: "OFFLINE",
    })
  })
})

describe("session", () => {
  it("forgets an expired token", () => {
    saveSession({
      token: "old",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      user: testOfficer,
    })
    expect(getSession()).toBeNull()
  })

  it("ignores a damaged saved session", () => {
    localStorage.setItem("agroconnect.session", "{not json")
    expect(getSession()).toBeNull()
  })
})
