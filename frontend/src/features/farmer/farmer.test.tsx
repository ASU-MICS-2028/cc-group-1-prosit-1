import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import type {
  Cooperative,
  HarvestForecast,
  Lessons,
  MyFarm,
  Prices,
  Weather,
} from "@/api/farmer"
import { db } from "@/db/local"
import { fakeServer, json } from "@/test/fakes"
import { renderRoute, testFarmer } from "@/test/renderRoute"

afterEach(() => {
  vi.unstubAllGlobals()
})

const myFarm: MyFarm = {
  farmer: {
    id: testFarmer.farmerId!,
    fullName: "Ama Boateng",
    phoneE164: "+233240001234",
    hasNoPhone: false,
    gender: "female",
    ageBand: "36-50",
    community: "Tolon",
    regionDistrict: "Northern",
    language: "tw",
    consentAt: "2026-10-06T09:00:00Z",
    crops: ["maize", "groundnut"],
    farmSize: 2.5,
    farmSizeUnit: "acres",
    soil: "loamy",
    plantingSeasons: ["rainy"],
    latitude: 9.43,
    longitude: -1.07,
    locationAccuracyMetres: 8,
    phoneType: "basic_phone",
    reachChannels: ["sms"],
    mobileMoney: "yes",
    helpNeeded: ["seeds"],
    createdAt: "2026-10-06T09:00:00Z",
  },
  officer: {
    fullName: "Fuseini Alhassan",
    phoneE164: "+233240000001",
    district: "Savelugu",
  },
  visits: [
    {
      id: "v1",
      status: "done",
      scheduledFor: "2026-10-05",
      completedAt: "2026-10-05T10:00:00Z",
      topics: ["pests", "weather"],
      observations: ["all_good"],
      notes: "Spray in the evening",
    },
  ],
}

const day = (
  date: string,
  condition: Weather["today"]["condition"],
  rain: number
) => ({
  date,
  condition,
  maxC: 31,
  minC: 22,
  rainChancePercent: rain,
})

const weather: Weather = {
  source: "sample",
  updatedAt: "2026-10-07T06:00:00Z",
  place: "Tolon",
  today: day("2026-10-07", "sunny", 0),
  nextDays: [
    day("2026-10-08", "rain", 80),
    day("2026-10-09", "partly_cloudy", 30),
    day("2026-10-10", "sunny", 0),
    day("2026-10-11", "sunny", 0),
    day("2026-10-12", "cloudy", 20),
    day("2026-10-13", "rain", 60),
    day("2026-10-14", "storm", 90),
  ],
  advice: "rain_soon_dont_spray",
}

const prices: Prices = {
  source: "sample",
  updatedAt: "2026-10-07T06:00:00Z",
  currency: "GHS",
  markets: ["Tamale", "Savelugu"],
  prices: [
    {
      crop: "maize",
      markets: [
        { market: "Tamale", pricePerKg: 6.5 },
        { market: "Savelugu", pricePerKg: 6.2 },
      ],
      weekChangePercent: 4,
      last30Days: [6, 6.2, 6.5],
    },
    {
      crop: "rice",
      markets: [
        { market: "Tamale", pricePerKg: 12 },
        { market: "Savelugu", pricePerKg: 11.8 },
      ],
      weekChangePercent: -2,
      last30Days: [12.5, 12.2, 12],
    },
  ],
}

const harvest: HarvestForecast = {
  source: "sample",
  crops: [{ crop: "maize", lowBags: 8, highBags: 12, harvestMonth: 9 }],
}

const cooperative: Cooperative = {
  source: "sample",
  name: "Tolon Farmers Cooperative",
  community: "Tolon",
  members: 42,
  chairName: "Alhassan Mahama",
  chairPhoneE164: "+233200000000",
  nextMeeting: "2026-10-10",
  meetingPlace: "Tolon community centre",
}

const lessons: Lessons = {
  source: "sample",
  lessons: [{ id: "dry-grain-storage", topic: "storage", minutes: 3 }],
}

/** The farmer endpoints answering like the API does with its sample providers. */
function farmerServer(extra: Record<string, (body: unknown) => Response> = {}) {
  return fakeServer({
    "GET /api/farmer/me": () => json(200, myFarm),
    "GET /api/farmer/weather": () => json(200, weather),
    "GET /api/farmer/prices": () => json(200, prices),
    "GET /api/farmer/harvest-forecast": () => json(200, harvest),
    "GET /api/farmer/cooperative": () => json(200, cooperative),
    "GET /api/farmer/lessons": () => json(200, lessons),
    ...extra,
  })
}

describe("farmer home", () => {
  it("shows their status, today's weather, the six services and their officer", async () => {
    farmerServer()
    renderRoute("/farmer", { as: "farmer" })

    expect(
      await screen.findByText("Registered 6 Oct by Fuseini")
    ).toBeInTheDocument()
    expect(screen.getByText("31°C · Sunny")).toBeInTheDocument()
    for (const service of [
      "Prices",
      "Weather",
      "Check my crop",
      "Harvest forecast",
      "My cooperative",
      "Lessons",
    ])
      expect(screen.getByRole("link", { name: service })).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /Call my officer/ })
    ).toHaveAttribute("href", "tel:+233240000001")
    expect(screen.getAllByRole("link", { name: "Market" })[0]).toHaveAttribute(
      "href",
      "/farmer/prices"
    )
  })

  it("reads their details aloud", async () => {
    const speakMock = vi.fn()
    vi.stubGlobal("speechSynthesis", { cancel: vi.fn(), speak: speakMock })
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        text: string
        lang = ""
        rate = 1
        constructor(t: string) {
          this.text = t
        }
      }
    )
    farmerServer()
    renderRoute("/farmer", { as: "farmer" })
    await screen.findByText("Registered 6 Oct by Fuseini")

    await userEvent.click(
      screen.getByRole("button", { name: /Listen to my details/ })
    )
    expect((speakMock.mock.calls[0][0] as { text: string }).text).toMatch(
      /^Ama Boateng\. Tolon, Northern/
    )
  })
})

describe("my details and changes", () => {
  it("shows the farm, the officer and the visits", async () => {
    farmerServer()
    renderRoute("/farmer/details", { as: "farmer" })

    expect(await screen.findByText("Maize, Groundnut")).toBeInTheDocument()
    expect(screen.getByText("2.5 acres, loamy")).toBeInTheDocument()
    expect(screen.getByText("Consent given 6 October 2026")).toBeInTheDocument()
    expect(screen.getByText("Fuseini Alhassan")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Call" })).toHaveAttribute(
      "href",
      "tel:+233240000001"
    )
    expect(screen.getByText("Pests, Weather")).toBeInTheDocument()
    expect(screen.getByText("Spray in the evening")).toBeInTheDocument()
  })

  it("sends a change to the officer and gives a reference", async () => {
    const fetchMock = farmerServer({
      "POST /api/farmer/change-requests": () =>
        json(202, { source: "sample", reference: "CR-261007-0192" }),
    })
    renderRoute("/farmer/details/change", { as: "farmer" })

    await userEvent.click(
      await screen.findByRole("button", { name: "Send to my officer" })
    )
    expect(screen.getByText("Write what should change.")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("radio", { name: "Crops" }))
    await userEvent.type(
      screen.getByRole("textbox", { name: "Tell us in a few words" }),
      "I now grow rice too"
    )
    await userEvent.click(
      screen.getByRole("button", { name: "Send to my officer" })
    )

    expect(
      await screen.findByText(/Reference CR-261007-0192/)
    ).toBeInTheDocument()
    const sent = fetchMock.mock.calls.find(
      ([url]) => String(url) === "/api/farmer/change-requests"
    )!
    expect(JSON.parse(String(sent[1]!.body))).toEqual({
      area: "crops",
      details: "I now grow rice too",
    })
  })
})

describe("farm services", () => {
  it("prices: every crop, the week's change, the farmer's own crops marked, and sample data said", async () => {
    farmerServer()
    renderRoute("/farmer/prices", { as: "farmer" })

    expect(await screen.findByText("Sample data")).toBeInTheDocument()
    expect(screen.getAllByText("+4%").length).toBeGreaterThan(0)
    expect(screen.getAllByText("-2%").length).toBeGreaterThan(0)
    expect(screen.getByText("Maize · Tamale · 30 days")).toBeInTheDocument()
    expect(screen.getAllByText("Your crop").length).toBeGreaterThan(0)

    await userEvent.click(screen.getAllByRole("button", { name: /Rice/ })[0])
    expect(screen.getByText("Rice · Tamale · 30 days")).toBeInTheDocument()
  })

  it("weather: today, the advice and the next 7 days", async () => {
    farmerServer()
    renderRoute("/farmer/weather", { as: "farmer" })

    expect(
      await screen.findByRole("heading", { name: "Weather · Tolon" })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Rain is coming. Don't spray today/)
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole("region", { name: "Next 7 days" })).getAllByRole(
        "listitem"
      )
    ).toHaveLength(7)
  })

  it("crop check: asks for a crop and a sign, then shows the problem and what to do", async () => {
    farmerServer({
      "POST /api/farmer/crop-check": () =>
        json(200, {
          source: "sample",
          likelyProblem: "fall_armyworm",
          urgent: true,
          advice: ["check_under_leaves", "ask_officer_spray"],
        }),
    })
    renderRoute("/farmer/crop-check", { as: "farmer" })

    await userEvent.click(await screen.findByRole("button", { name: "Check" }))
    expect(screen.getByText("Choose the crop.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("radio", { name: "Maize" }))
    await userEvent.click(screen.getByRole("button", { name: "Check" }))
    expect(
      screen.getByText("Choose at least one thing you see.")
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Holes in leaves" })
    )
    await userEvent.click(screen.getByRole("button", { name: "Check" }))

    expect(
      await screen.findByRole("heading", { name: "Possible fall armyworm" })
    ).toBeInTheDocument()
    expect(screen.getByText("Act today")).toBeInTheDocument()
    expect(
      screen.getByText(/Ask your officer which spray to use/)
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Check again" }))
    expect(
      screen.getByRole("checkbox", { name: "Holes in leaves" })
    ).not.toBeChecked()
  })

  it("harvest, cooperative and lessons", async () => {
    farmerServer()
    const { unmount } = renderRoute("/farmer/harvest", { as: "farmer" })
    expect(
      await screen.findByText("8 to 12 bags of 100 kg")
    ).toBeInTheDocument()
    expect(screen.getByText("Usually ready in September")).toBeInTheDocument()
    unmount()

    const coop = renderRoute("/farmer/cooperative", { as: "farmer" })
    expect(
      await screen.findByText("Tolon Farmers Cooperative")
    ).toBeInTheDocument()
    expect(screen.getByText(/42 members/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /^Call / })).toHaveAttribute(
      "href",
      "tel:+233200000000"
    )
    coop.unmount()

    renderRoute("/farmer/lessons", { as: "farmer" })
    expect(await screen.findByText("Keep your grain dry")).toBeInTheDocument()
    expect(screen.getByText("Storage · 3 min")).toBeInTheDocument()
  })
})

describe("offline", () => {
  it("shows the copy saved on the device, with its time, when the network is gone", async () => {
    farmerServer()
    const first = renderRoute("/farmer/harvest", { as: "farmer" })
    expect(
      await screen.findByText("8 to 12 bags of 100 kg")
    ).toBeInTheDocument()
    await waitFor(async () => expect(await db.cache.count()).toBeGreaterThan(0))
    first.unmount()

    fakeServer({}) // no network
    renderRoute("/farmer/harvest", { as: "farmer" })
    expect(
      await screen.findByText("8 to 12 bags of 100 kg")
    ).toBeInTheDocument()
    expect(
      await screen.findByText(/No network · saved today/)
    ).toBeInTheDocument()
  })

  it("explains when nothing is saved yet, and tries again", async () => {
    fakeServer({})
    renderRoute("/farmer/cooperative", { as: "farmer" })
    expect(
      await screen.findByText(/nothing is saved on this device yet/)
    ).toBeInTheDocument()

    farmerServer()
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(
      await screen.findByText("Tolon Farmers Cooperative")
    ).toBeInTheDocument()
  })
})
