import type { components } from "@/api/schema"
import type { Role } from "@/auth/session"
import { api } from "./client"

type Schemas = components["schemas"]

/** "Send code": the server texts a 6-digit code. Same answer whether or not the number has an account. */
export function requestCode(phone: string, role: Role) {
  return api<Schemas["RequestCodeResponse"]>("/api/auth/code", {
    method: "POST",
    body: { phone, role } satisfies Schemas["RequestCodeRequest"],
  })
}

/** "Verify": swaps the code for a token and the signed-in person. */
export function verifyCode(phone: string, role: Role, code: string) {
  return api<Schemas["AuthResponse"]>("/api/auth/verify", {
    method: "POST",
    body: { phone, role, code } satisfies Schemas["VerifyCodeRequest"],
  })
}
