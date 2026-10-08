import { describe, expect, it } from "vitest"
import { niceTicks } from "./niceTicks"

describe("niceTicks", () => {
  it("steps by 1, 2 or 5 times a power of ten, ending at or above the largest value", () => {
    expect(niceTicks(12)).toEqual([0, 5, 10, 15])
    expect(niceTicks(15800)).toEqual([0, 5000, 10000, 15000, 20000])
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8])
    expect(niceTicks(40)).toEqual([0, 10, 20, 30, 40])
  })

  it("gives a usable axis when every value is zero", () => {
    expect(niceTicks(0)).toEqual([0, 1])
  })
})
