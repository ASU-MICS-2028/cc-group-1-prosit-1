import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { db, type LocalFarmer } from "@/db/local"
import { renderRoute, testOfficer } from "@/test/renderRoute"
import { emptyRegistration, type Registration } from "./schema"

// These tests click through whole registrations (dozens of steps each), and the first one also
// waits for the form's code to compile; 5 s is too short on a busy machine or a CI runner.
vi.setConfig({ testTimeout: 30_000 })

vi.mock("browser-image-compression", () => ({
  default: vi.fn(async () => new Blob(["small"], { type: "image/jpeg" })),
}))

afterEach(() => {
  Reflect.deleteProperty(navigator, "geolocation")
  Reflect.deleteProperty(URL, "createObjectURL")
  Reflect.deleteProperty(URL, "revokeObjectURL")
})

/** Gives the test "phone" a GPS (jsdom has none). */
function setGps(getCurrentPosition: Geolocation["getCurrentPosition"]) {
  Object.defineProperty(navigator, "geolocation", {
    value: { getCurrentPosition },
    configurable: true,
  })
}

const next = () => userEvent.click(screen.getByRole("button", { name: "Next" }))

/** A form already past consent, kept on the phone as a draft at `step`. */
async function draftAt(step: number, data: Partial<Registration> = {}) {
  await db.drafts.put({
    id: "registration",
    data: { ...emptyRegistration, consentGiven: true, ...data },
    step,
    updatedAt: new Date().toISOString(),
  })
}

const ready: Partial<Registration> = {
  fullName: "Ama Boateng",
  phone: "240001234",
  gender: "female",
  ageBand: "36-50",
  community: "Tolon",
  crops: ["maize"],
}

function savedFarmer(overrides: Partial<LocalFarmer> = {}): LocalFarmer {
  const { phone, ...answers } = { ...emptyRegistration, ...ready }
  void phone
  return {
    ...answers,
    id: "0192f0a0-0000-7000-8000-0000000000aa",
    phoneE164: "+233240001234",
    language: "en",
    consentAt: "2026-10-06T09:00:00Z",
    registeredById: testOfficer.id,
    createdAt: "2026-10-06T09:00:00Z",
    clientUpdatedAt: "2026-10-06T09:00:00Z",
    syncStatus: "waiting",
    ...overrides,
  }
}

describe("registering a farmer", () => {
  it("asks for consent first; No goes home and keeps nothing", async () => {
    renderRoute("/register")
    expect(
      await screen.findByRole("heading", { name: "May we save your details?" })
    ).toBeInTheDocument()
    expect(screen.getByText("Step 1 of 7")).toBeInTheDocument()
    // Nothing is kept before the farmer agrees, so nothing claims to be saved
    expect(screen.queryByText("Draft saved")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "No" }))
    expect(
      await screen.findByRole("heading", { name: "No farmers yet" })
    ).toBeInTheDocument()
    expect(
      screen.queryByText("Continue where you stopped")
    ).not.toBeInTheDocument()
    expect(await db.drafts.count()).toBe(0)
  })

  it("goes through all 7 steps, checks the answers and saves on the phone", async () => {
    const { router } = renderRoute("/register")
    await userEvent.click(
      await screen.findByRole("button", { name: "Yes, I agree" })
    )

    // Step 2: nothing filled in → the pink boxes explain what is missing
    expect(
      await screen.findByRole("heading", { name: "About the farmer" })
    ).toBeInTheDocument()
    await next()
    expect(
      await screen.findByText("Enter the farmer’s full name.")
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Enter the farmer’s phone number/)
    ).toBeInTheDocument()

    await userEvent.type(
      screen.getByRole("textbox", { name: "Full name" }),
      "Ama Boateng"
    )
    await userEvent.type(
      screen.getByRole("textbox", { name: "Phone number" }),
      "24000"
    )
    await next()
    expect(
      await screen.findByText(
        "This number is too short. Enter 9 digits after +233."
      )
    ).toBeInTheDocument()
    expect(
      screen.getByRole("textbox", { name: "Phone number" })
    ).toHaveAttribute("aria-invalid", "true")
    await userEvent.type(
      screen.getByRole("textbox", { name: "Phone number" }),
      "1234"
    )
    await userEvent.click(screen.getByRole("radio", { name: "Female" }))
    await userEvent.type(
      screen.getByRole("textbox", { name: "Community" }),
      "Tolon"
    )
    await next()

    // Step 3: at least one crop
    expect(await screen.findByText("Step 3 of 7")).toBeInTheDocument()
    expect(router.state.location.search).toBe("?step=3")
    await next()
    expect(
      await screen.findByText("Choose at least one crop.")
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole("checkbox", { name: "Maize" }))
    await userEvent.click(screen.getByRole("button", { name: "Bigger" }))
    await next()

    // Steps 4 to 7 can all be skipped
    for (const step of [4, 5, 6, 7]) {
      expect(await screen.findByText(`Step ${step} of 7`)).toBeInTheDocument()
      await next()
    }

    expect(
      await screen.findByRole("heading", { name: "Check and save" })
    ).toBeInTheDocument()
    expect(screen.getByText("All 7 steps done")).toBeInTheDocument()
    expect(screen.getByText("Ama Boateng")).toBeInTheDocument()
    expect(screen.getByText("+233 24 000 1234")).toBeInTheDocument()
    expect(screen.getByText("1.5 acres")).toBeInTheDocument()
    expect(screen.getByText("Draft saved")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Save farmer" }))
    expect(await screen.findByText("Saved on this phone")).toBeInTheDocument()
    expect(
      screen.getByText(/Ama Boateng is registered. We will send her details/)
    ).toBeInTheDocument()
    // Only the sidebar (shown from 768 px); the phone bottom bar is gone
    expect(screen.getAllByRole("navigation", { name: "Main" })).toHaveLength(1)

    const [farmer] = await db.farmers.toArray()
    expect(farmer).toMatchObject({
      fullName: "Ama Boateng",
      phoneE164: "+233240001234",
      gender: "female",
      community: "Tolon",
      crops: ["maize"],
      farmSize: 1.5,
      registeredById: testOfficer.id,
      syncStatus: "waiting",
    })
    expect(await db.outbox.toArray()).toEqual([
      expect.objectContaining({ kind: "farmer", recordId: farmer.id }),
    ])
    expect(await db.drafts.count()).toBe(0)
  })

  it("keeps the answers as a draft and opens where the officer stopped", async () => {
    await draftAt(3, { fullName: "Kofi Asante" })
    renderRoute("/register")
    expect(
      await screen.findByRole("heading", { name: "The farm" })
    ).toBeInTheDocument()
  })

  it("saves the draft after an answer, and Save and exit goes home", async () => {
    await draftAt(2)
    renderRoute("/register?step=2")
    await userEvent.type(
      await screen.findByRole("textbox", { name: "Full name" }),
      "Kofi"
    )
    await waitFor(async () =>
      expect((await db.drafts.get("registration"))?.data.fullName).toBe("Kofi")
    )
    await userEvent.click(screen.getByRole("button", { name: "Save and exit" }))
    // Home offers to carry on where the officer stopped
    expect(
      await screen.findByText("Continue where you stopped")
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Kofi/ })).toHaveAttribute(
      "href",
      "/register?step=2"
    )
    expect(await db.drafts.count()).toBe(1)
  })

  it("starts at consent when the address skips ahead without it", async () => {
    renderRoute("/register?step=5")
    expect(
      await screen.findByRole("heading", { name: "May we save your details?" })
    ).toBeInTheDocument()
  })

  it("Back goes to the step before", async () => {
    await draftAt(3, ready)
    renderRoute("/register?step=3")
    await screen.findByRole("heading", { name: "The farm" })
    const footerBack = screen
      .getAllByRole("button", { name: "Back" })
      .at(-1) as HTMLElement
    await userEvent.click(footerBack)
    expect(
      await screen.findByRole("heading", { name: "About the farmer" })
    ).toBeInTheDocument()
  })

  it("Edit on Check and save opens that step, and Done comes back", async () => {
    await draftAt(7, ready)
    renderRoute("/register?step=review")
    await userEvent.click(
      await screen.findByRole("button", { name: "Edit The farm" })
    )
    expect(await screen.findByText("Step 3 of 7")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("checkbox", { name: "Rice" }))
    await userEvent.click(screen.getByRole("button", { name: "Done" }))
    expect(
      await screen.findByRole("heading", { name: "Check and save" })
    ).toBeInTheDocument()
    expect(screen.getByText("Maize, Rice")).toBeInTheDocument()
  })

  it("sends a broken old draft back to the step to fix", async () => {
    await draftAt(7, { ...ready, crops: [] })
    renderRoute("/register?step=review")
    await userEvent.click(
      await screen.findByRole("button", { name: "Save farmer" })
    )
    expect(
      await screen.findByText("Choose at least one crop.")
    ).toBeInTheDocument()
    expect(await db.farmers.count()).toBe(0)
  })

  it("ticking No phone hides the number and its rule", async () => {
    await draftAt(2, { ...ready, phone: "" })
    renderRoute("/register?step=2")
    await userEvent.click(
      await screen.findByRole("checkbox", { name: "The farmer has no phone" })
    )
    expect(
      screen.queryByRole("textbox", { name: "Phone number" })
    ).not.toBeInTheDocument()
    await next()
    expect(await screen.findByText("Step 3 of 7")).toBeInTheDocument()
  })

  it("saves a farmer with no phone, without the duplicate check", async () => {
    await db.farmers.add(savedFarmer({ phoneE164: null }))
    await draftAt(7, { ...ready, phone: "", hasNoPhone: true })
    renderRoute("/register?step=review")
    expect(await screen.findByText("No phone")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Save farmer" }))
    expect(await screen.findByText("Saved on this phone")).toBeInTheDocument()
    const saved = await db.farmers.toArray()
    expect(saved.map((f) => f.phoneE164)).toEqual([null, null])
  })
})

describe("the same phone number twice", () => {
  it("asks first; a different person sharing the phone is saved", async () => {
    await db.farmers.add(savedFarmer({ fullName: "Akosua Boateng" }))
    await draftAt(7, ready)
    renderRoute("/register?step=review")
    await userEvent.click(
      await screen.findByRole("button", { name: "Save farmer" })
    )

    expect(
      await screen.findByRole("heading", { name: "Check before saving" })
    ).toBeInTheDocument()
    expect(
      screen.getByText("This phone number is already used")
    ).toBeInTheDocument()
    const existing = screen.getByText("Already registered").closest("section")!
    expect(within(existing).getByText("Akosua Boateng")).toBeInTheDocument()
    expect(within(existing).getByText(/registered 6 Oct/)).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole("button", { name: "Different person, shares the phone" })
    )
    expect(await screen.findByText("Saved on this phone")).toBeInTheDocument()
    expect(await db.farmers.count()).toBe(2)
  })

  it("the same person opens their profile and drops the draft", async () => {
    const existing = savedFarmer()
    await db.farmers.add(existing)
    await draftAt(7, ready)
    const { router } = renderRoute("/register?step=review")
    await userEvent.click(
      await screen.findByRole("button", { name: "Save farmer" })
    )
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Same person, open Ama’s profile",
      })
    )
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/farmers/${existing.id}`)
    )
    expect(await db.farmers.count()).toBe(1)
    expect(await db.drafts.count()).toBe(0)
  })

  it("Back returns to Check and save", async () => {
    await db.farmers.add(savedFarmer())
    await draftAt(7, ready)
    renderRoute("/register?step=review")
    await userEvent.click(
      await screen.findByRole("button", { name: "Save farmer" })
    )
    await screen.findByRole("heading", { name: "Check before saving" })
    await userEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(
      await screen.findByRole("heading", { name: "Check and save" })
    ).toBeInTheDocument()
  })
})

describe("location and photo", () => {
  function stubGps(
    outcome: "found" | "denied" | "failed"
  ): Geolocation["getCurrentPosition"] {
    return (success, failure) => {
      if (outcome === "found") {
        success({
          coords: {
            latitude: 9.4321234,
            longitude: -0.8512349,
            accuracy: 12.4,
          },
        } as GeolocationPosition)
      } else {
        failure?.({
          code: outcome === "denied" ? 1 : 2,
          PERMISSION_DENIED: 1,
        } as GeolocationPositionError)
      }
    }
  }

  it("finds the farm with the phone's GPS", async () => {
    setGps(stubGps("found"))
    await draftAt(4, ready)
    renderRoute("/register?step=4")
    await userEvent.click(
      await screen.findByRole("button", { name: "Find farm location" })
    )
    expect(await screen.findByText("Location found")).toBeInTheDocument()
    expect(
      screen.getByText("9.432123, -0.851235 · Accurate to about 12 m")
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Try again" })
    ).toBeInTheDocument()
  })

  it.each([
    ["denied", "Location is turned off for this app."],
    ["failed", "Could not find the location."],
  ] as const)(
    "explains when GPS is %s, and the form can go on",
    async (outcome, text) => {
      setGps(stubGps(outcome))
      await draftAt(4, ready)
      renderRoute("/register?step=4")
      await userEvent.click(
        await screen.findByRole("button", { name: "Find farm location" })
      )
      expect(await screen.findByText(new RegExp(text))).toBeInTheDocument()
      await next()
      expect(await screen.findByText("Step 5 of 7")).toBeInTheDocument()
    }
  )

  it("shrinks the photo and keeps it on the phone", async () => {
    Object.assign(URL, {
      createObjectURL: () => "blob:photo",
      revokeObjectURL: () => {},
    })
    await draftAt(4, ready)
    renderRoute("/register?step=4")
    const file = new File(["big photo"], "farm.jpg", { type: "image/jpeg" })
    await userEvent.upload(await screen.findByLabelText("Take a photo"), file)
    expect(
      await screen.findByRole("img", { name: "Photo of the farm" })
    ).toHaveAttribute("src", "blob:photo")
    const [photo] = await db.photos.toArray()
    expect(photo).toMatchObject({ farmerId: null, sizeBytes: 5 })
    expect(screen.getByLabelText("Take another photo")).toBeInTheDocument()
  })
})

describe("saved page", () => {
  it("works without the farmer's name, and has no bottom bar", async () => {
    renderRoute("/register/saved")
    expect(
      await screen.findByText(
        /The farmer is registered. We will send their details/
      )
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Register another farmer" })
    ).toHaveAttribute("href", "/register")
    expect(screen.getByRole("link", { name: "Go to home" })).toHaveAttribute(
      "href",
      "/"
    )
  })
})
