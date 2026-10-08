import { describe, expect, it } from "vitest"
import { amount, fullName, ghanaPhone, required } from "./validate"

describe("field checks", () => {
  it("phone numbers", () => {
    expect(ghanaPhone("")).toBe("validate.required")
    expect(ghanaPhone("024 555 0182")).toBeNull()
    expect(ghanaPhone("+233 24 555 0182")).toBeNull()
    expect(ghanaPhone("12345")).toBe("validate.phone")
    expect(ghanaPhone("0245550182", "+233245550182")).toBe("validate.ownPhone")
  })
  it("names", () => {
    expect(fullName("Amina Yakubu")).toBeNull()
    expect(fullName("Kofi")).toBe("validate.fullName")
    expect(fullName("K0fi Asante")).toBe("validate.fullName")
    expect(fullName("  ")).toBe("validate.required")
  })
  it("amounts", () => {
    expect(amount("1200")).toBeNull()
    expect(amount("0")).toBe("validate.amountMin")
    expect(amount("20000")).toBe("validate.amountMax")
    expect(amount("12.5")).toBe("validate.whole")
    expect(amount("")).toBe("validate.required")
  })
  it("required", () => {
    expect(required("x")).toBeNull()
    expect(required(" ")).toBe("validate.required")
  })
})
