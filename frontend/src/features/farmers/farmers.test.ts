import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { db, type LocalFarmer } from "@/db/local"
import { emptyRegistration } from "@/features/registration/schema"
import {
  countByStatus,
  filterFarmers,
  useFarmers,
  type FarmerSummary,
} from "./farmers"

const farmers: FarmerSummary[] = [
  {
    id: "1",
    name: "Ama Boateng",
    village: "Tolon",
    phone: "+233240001234",
    status: "waiting",
  },
  {
    id: "2",
    name: "Kwame Mensah",
    village: "Savelugu",
    phone: "+233550005678",
    status: "synced",
  },
  {
    id: "3",
    name: "Fatima Abdulai",
    village: "Tamale",
    phone: "+233200004321",
    status: "failed",
  },
  {
    id: "4",
    name: "Yaw Boateng",
    village: "Tolon",
    phone: "+233240009999",
    status: "synced",
  },
]

describe("countByStatus", () => {
  it("counts each state, including those with none", () => {
    expect(countByStatus(farmers)).toEqual({ waiting: 1, synced: 2, failed: 1 })
    expect(countByStatus([])).toEqual({ waiting: 0, synced: 0, failed: 0 })
  })
})

describe("filterFarmers", () => {
  it("returns everyone for an empty search and all statuses", () => {
    expect(filterFarmers(farmers, "  ", "all")).toHaveLength(4)
  })

  it("searches names without caring about case", () => {
    expect(filterFarmers(farmers, "boateng", "all").map((f) => f.id)).toEqual([
      "1",
      "4",
    ])
  })

  it("searches phone digits however they are typed", () => {
    expect(
      filterFarmers(farmers, "024 000 1234", "all").map((f) => f.id)
    ).toEqual(["1"])
    expect(filterFarmers(farmers, "+233 55", "all").map((f) => f.id)).toEqual([
      "2",
    ])
  })

  it("limits to one sync state, and combines with the search", () => {
    expect(filterFarmers(farmers, "", "synced").map((f) => f.id)).toEqual([
      "2",
      "4",
    ])
    expect(
      filterFarmers(farmers, "boateng", "synced").map((f) => f.id)
    ).toEqual(["4"])
  })

  it("finds nothing for a name nobody has", () => {
    expect(filterFarmers(farmers, "zzz", "all")).toEqual([])
  })
})

describe("useFarmers", () => {
  it("is empty when nobody is saved on this phone", async () => {
    const { result } = renderHook(() => useFarmers())
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(result.current).toEqual([])
  })

  it("lists saved farmers, newest change first, and updates live", async () => {
    const { phone, ...answers } = emptyRegistration
    void phone // the saved farmer keeps phoneE164 instead
    const farmer = (id: string, name: string, at: string): LocalFarmer => ({
      ...answers,
      id,
      fullName: name,
      community: "Tolon",
      phoneE164: id === "a" ? "+233240001234" : null,
      language: "en",
      consentAt: at,
      registeredById: "officer",
      createdAt: at,
      clientUpdatedAt: at,
      syncStatus: "waiting",
    })
    await db.farmers.add(farmer("a", "Ama Boateng", "2026-10-06T10:00:00Z"))
    const { result } = renderHook(() => useFarmers())
    await waitFor(() => expect(result.current).toHaveLength(1))

    await db.farmers.add(farmer("b", "Abena Owusu", "2026-10-07T10:00:00Z"))
    await waitFor(() =>
      expect(result.current.map((f) => f.name)).toEqual([
        "Abena Owusu",
        "Ama Boateng",
      ])
    )
    expect(result.current[1]).toEqual({
      id: "a",
      name: "Ama Boateng",
      village: "Tolon",
      phone: "+233240001234",
      status: "waiting",
      createdAt: "2026-10-06T10:00:00Z",
      updatedAt: "2026-10-06T10:00:00Z",
      problem: null,
    })
  })
})

describe("filterFarmers without a phone", () => {
  it("still finds a farmer with no phone by name, never by digits", () => {
    const noPhone: FarmerSummary = {
      id: "9",
      name: "Adwoa",
      village: "Tolon",
      phone: null,
      status: "waiting",
    }
    expect(filterFarmers([noPhone], "adwoa", "all")).toHaveLength(1)
    expect(filterFarmers([noPhone], "024", "all")).toHaveLength(0)
  })
})
