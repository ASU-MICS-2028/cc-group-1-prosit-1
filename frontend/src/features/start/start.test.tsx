import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { renderRoute, testFarmer, testOfficer } from "@/test/renderRoute"
import { formatCountdown, roleFrom } from "./login"

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

/** A fake server: answers by path. Returns the mock so tests can check what was sent. */
function server(answers: Record<string, () => Response>) {
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      void init
      const path = String(input)
      const answer = answers[path]
      if (!answer) throw new Error(`unexpected call to ${path}`)
      return answer()
    }
  )
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function sentBody(fetchMock: ReturnType<typeof server>, index = 0) {
  const init = fetchMock.mock.calls[index][1] as RequestInit
  return JSON.parse(String(init.body)) as Record<string, string>
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("start screens", () => {
  it("welcomes a new phone and leads to the language choice", async () => {
    const { router } = renderRoute("/", { firstRun: true })
    expect(
      await screen.findByRole("heading", { name: "Farmer support for Ghana" })
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/welcome")
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute(
      "href",
      "/language"
    )
  })

  it("previews a language without saving it, then saves it on Continue", async () => {
    const { router } = renderRoute("/language", { firstRun: true })
    expect(await screen.findByRole("radio", { name: /English/ })).toBeChecked()

    await userEvent.click(screen.getByRole("radio", { name: /Twi/ }))
    expect(
      screen.getByRole("button", { name: "Continue in Twi" })
    ).toBeInTheDocument()
    expect(localStorage.getItem("agroconnect.lang")).toBeNull()

    await userEvent.click(screen.getByRole("radio", { name: /Eʋegbe/ }))
    await userEvent.click(
      screen.getByRole("button", { name: "Continue in Eʋegbe" })
    )
    await waitFor(() => expect(router.state.location.pathname).toBe("/who"))
    expect(localStorage.getItem("agroconnect.lang")).toBe("ee")
  })

  it("asks who you are once the language is known", async () => {
    const { router } = renderRoute("/", { as: null })
    expect(
      await screen.findByRole("heading", { name: "Who are you?" })
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/who")
    expect(
      screen.getByRole("link", { name: /Extension officer/ })
    ).toHaveAttribute("href", "/login/officer")
    expect(screen.getByRole("link", { name: /Farmer/ })).toHaveAttribute(
      "href",
      "/login/farmer"
    )
  })

  it("refuses a number that is not from Ghana without calling the server", async () => {
    const fetchMock = server({})
    renderRoute("/login/officer", { as: null })
    await userEvent.type(await screen.findByLabelText("Phone number"), "12345")
    await userEvent.click(screen.getByRole("button", { name: "Send code" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a Ghana number, like 24 000 0000."
    )
    expect(fetchMock).not.toHaveBeenCalled()

    // The message goes away as soon as the number is being corrected.
    await userEvent.type(screen.getByLabelText("Phone number"), "6")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(
      screen.getByText(
        "New officer? Your MoFA admin adds you first, then you can log in."
      )
    ).toBeInTheDocument()
  })

  it("signs an officer in with the SMS code and opens the officer home", async () => {
    const fetchMock = server({
      "/api/auth/code": () =>
        json(202, { resendAfterSeconds: 45, expiresInSeconds: 600 }),
      "/api/auth/verify": () =>
        json(200, {
          token: "jwt",
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
          user: testOfficer,
        }),
    })
    const { router } = renderRoute("/login/officer", { as: null })
    expect(await screen.findByText("Officer log in")).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText("Phone number"), "024 000 0001")
    await userEvent.click(screen.getByRole("button", { name: "Send code" }))

    expect(
      await screen.findByText(/Sent to \+233 24 ••• 0001/)
    ).toBeInTheDocument()
    expect(sentBody(fetchMock)).toEqual({
      phone: "+233240000001",
      role: "officer",
    })
    expect(
      screen.getByText("Didn't get it? Resend code in 0:45")
    ).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText("6-digit code"), "123456")
    await userEvent.click(screen.getByRole("button", { name: "Verify" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/"))
    expect(sentBody(fetchMock, 1)).toEqual({
      phone: "+233240000001",
      role: "officer",
      code: "123456",
    })
    expect(JSON.parse(localStorage.getItem("agroconnect.session")!).token).toBe(
      "jwt"
    )
  })

  it("shows the server's message for a wrong code and keeps the person on the screen", async () => {
    server({
      "/api/auth/verify": () =>
        json(400, {
          title: "CODE_WRONG",
          detail: "That code is not right. Check the SMS and try again.",
        }),
    })
    const { router } = renderRoute("/login/officer/code", {
      as: null,
      state: { phone: "+233240000001", resendAfterSeconds: 0 },
    })
    await userEvent.type(await screen.findByLabelText("6-digit code"), "000000")
    await userEvent.click(screen.getByRole("button", { name: "Verify" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That code is not right."
    )
    expect(router.state.location.pathname).toBe("/login/officer/code")
    expect(localStorage.getItem("agroconnect.session")).toBeNull()
  })

  it("asks for all six digits before calling the server", async () => {
    const fetchMock = server({})
    renderRoute("/login/officer/code", {
      as: null,
      state: { phone: "+233240000001", resendAfterSeconds: 0 },
    })
    await userEvent.type(await screen.findByLabelText("6-digit code"), "12a3")
    expect(screen.getByLabelText("6-digit code")).toHaveValue("123")
    await userEvent.click(screen.getByRole("button", { name: "Verify" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter all 6 digits."
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("offers a new code once the wait is over", async () => {
    const fetchMock = server({
      "/api/auth/code": () =>
        json(202, { resendAfterSeconds: 45, expiresInSeconds: 600 }),
    })
    renderRoute("/login/farmer/code", {
      as: null,
      state: { phone: "+233240001234", resendAfterSeconds: 0 },
    })
    await userEvent.click(
      await screen.findByRole("button", { name: "Resend code" })
    )

    expect(
      await screen.findByText("A new code is on its way.")
    ).toBeInTheDocument()
    expect(sentBody(fetchMock)).toEqual({
      phone: "+233240001234",
      role: "farmer",
    })
    expect(
      screen.getByText("Didn't get it? Resend code in 0:45")
    ).toBeInTheDocument()
  })

  it("says so when there is no network", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))
    )
    renderRoute("/login/farmer", { as: null })
    await userEvent.type(
      await screen.findByLabelText("Phone number"),
      "0240001234"
    )
    await userEvent.click(screen.getByRole("button", { name: "Send code" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No network. Connect to the internet and try again."
    )
  })

  it("sends someone who opens the code screen directly back to enter a number", async () => {
    const { router } = renderRoute("/login/farmer/code", { as: null })
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/login/farmer")
    )
  })

  it("signs a farmer in to the farmer app, and logs them out", async () => {
    server({
      "/api/auth/verify": () =>
        json(200, {
          token: "jwt",
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
          user: testFarmer,
        }),
    })
    const { router } = renderRoute("/login/farmer/code", {
      as: null,
      state: { phone: "+233240001234", resendAfterSeconds: 45 },
    })
    expect(await screen.findByText("Farmer log in")).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("6-digit code"), "123456")
    await userEvent.click(screen.getByRole("button", { name: "Verify" }))

    expect(
      await screen.findByRole("heading", { name: "Ama" })
    ).toBeInTheDocument()
    expect(screen.getByText("Saved with MoFA")).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/farmer")

    // Log out lives on Profile, behind "Log out?"
    await userEvent.click(screen.getAllByRole("link", { name: "Profile" })[0])
    await userEvent.click(
      await screen.findByRole("button", { name: "Log out" })
    )
    const sheet = await screen.findByRole("dialog", { name: "Log out?" })
    await userEvent.click(
      within(sheet).getByRole("button", { name: "Log out" })
    )
    await waitFor(() => expect(router.state.location.pathname).toBe("/who"))
    expect(localStorage.getItem("agroconnect.session")).toBeNull()
  })

  it("keeps signed-in people out of the start screens and in their own app", async () => {
    const officer = renderRoute("/welcome")
    await waitFor(() =>
      expect(officer.router.state.location.pathname).toBe("/")
    )
    officer.unmount()

    const farmer = renderRoute("/farmers", { as: "farmer" })
    await waitFor(() =>
      expect(farmer.router.state.location.pathname).toBe("/farmer")
    )
  })
})

describe("log-in helpers", () => {
  it("reads the role from the address", () => {
    expect(roleFrom("farmer")).toBe("farmer")
    expect(roleFrom("officer")).toBe("officer")
    expect(roleFrom("admin")).toBe("officer")
    expect(roleFrom(undefined)).toBe("officer")
  })

  it("shows seconds as m:ss", () => {
    expect(formatCountdown(45)).toBe("0:45")
    expect(formatCountdown(65)).toBe("1:05")
    expect(formatCountdown(-3)).toBe("0:00")
  })
})
