import { describe, expect, it } from "vitest"
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
  it("is empty until the offline store is connected", () => {
    expect(useFarmers()).toEqual([])
  })
})
