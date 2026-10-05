import { describe, expect, it } from "vitest"
import { initials, maskPhone } from "./phone"

describe("maskPhone", () => {
  it("hides the middle digits like the design", () => {
    expect(maskPhone("+233240001234")).toBe("+233 24 ••• 1234")
  })

  it("hides anything that is not a Ghana number", () => {
    expect(maskPhone("0240001234")).toBe("•••")
    expect(maskPhone("")).toBe("•••")
  })
})

describe("initials", () => {
  it("uses the first and last name", () => {
    expect(initials("Ama Boateng")).toBe("AB")
    expect(initials("kwame yaw mensah")).toBe("KM")
  })

  it("copes with one name or none", () => {
    expect(initials("Fatima")).toBe("F")
    expect(initials("   ")).toBe("?")
  })
})
