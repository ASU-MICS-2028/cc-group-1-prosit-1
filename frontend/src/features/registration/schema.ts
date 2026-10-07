import { z } from "zod"
import { toE164 } from "@/lib/phone"
import {
  AGE_BANDS,
  AREA_UNITS,
  CHANNELS,
  CROPS,
  DATA_PURCHASES,
  GENDERS,
  HELP_NEEDS,
  INCOME_SOURCES,
  LAST_VISITS,
  MOBILE_MONEY,
  PHONE_TYPES,
  SEASONS,
  SOILS,
} from "./options"

const codes = <T extends readonly { code: string }[]>(list: T) =>
  list.map((o) => o.code) as [T[number]["code"], ...T[number]["code"][]]

/**
 * Everything the 7 steps collect. Error messages are language-file keys (register.errors.*),
 * so a rule broken in Twi shows the Twi message.
 */
export const registrationSchema = z
  .object({
    // Step 1: consent
    consentGiven: z.boolean(),
    // Step 2: about the farmer
    fullName: z.string().trim().min(2, "register.errors.name"),
    phone: z.string(),
    hasNoPhone: z.boolean(),
    gender: z.enum(GENDERS).nullable(),
    ageBand: z.enum(AGE_BANDS).nullable(),
    community: z.string().trim().max(100),
    regionDistrict: z.string().trim().max(100),
    // Step 3: the farm
    crops: z.array(z.enum(codes(CROPS))).min(1, "register.errors.crops"),
    farmSize: z.number().positive("register.errors.farmSize").max(100000),
    farmSizeUnit: z.enum(AREA_UNITS),
    soil: z.enum(SOILS).nullable(),
    plantingSeasons: z.array(z.enum(codes(SEASONS))),
    // Step 4: location and photo (never required: no GPS or camera must not block a registration)
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    locationAccuracyMetres: z.number().nullable(),
    photoId: z.string().nullable(),
    photoSizeBytes: z.number().nullable(),
    // Step 5: contact
    phoneType: z.enum(codes(PHONE_TYPES)).nullable(),
    dataPurchase: z.enum(DATA_PURCHASES).nullable(),
    reachChannels: z.array(z.enum(codes(CHANNELS))),
    // Step 6: money (all optional)
    incomeSources: z.array(z.enum(codes(INCOME_SOURCES))),
    hasBankAccount: z.boolean().nullable(),
    mobileMoney: z.enum(MOBILE_MONEY).nullable(),
    // Step 7: help needed
    lastAgentVisit: z.enum(LAST_VISITS).nullable(),
    helpNeeded: z.array(z.enum(codes(HELP_NEEDS))),
  })
  .superRefine((value, ctx) => {
    if (value.hasNoPhone) return
    const digits = value.phone.replace(/\D/g, "").replace(/^0/, "")
    if (digits.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "register.errors.phoneMissing",
      })
    } else if (digits.length < 9) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "register.errors.phoneShort",
      })
    } else if (!toE164(value.phone)) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "register.errors.phoneInvalid",
      })
    }
  })

export type Registration = z.infer<typeof registrationSchema>
export type RegistrationField = keyof Registration

export const emptyRegistration: Registration = {
  consentGiven: false,
  fullName: "",
  phone: "",
  hasNoPhone: false,
  gender: null,
  ageBand: null,
  community: "",
  regionDistrict: "",
  crops: [],
  farmSize: 1,
  farmSizeUnit: "acres",
  soil: null,
  plantingSeasons: [],
  latitude: null,
  longitude: null,
  locationAccuracyMetres: null,
  photoId: null,
  photoSizeBytes: null,
  phoneType: null,
  dataPurchase: null,
  reachChannels: [],
  incomeSources: [],
  hasBankAccount: null,
  mobileMoney: null,
  lastAgentVisit: null,
  helpNeeded: [],
}

/** The 7 steps: title key, guide picture (desktop) and the fields checked before moving on. */
export const STEPS = [
  { key: "consent", illustration: "consent", fields: ["consentGiven"] },
  {
    key: "personal",
    illustration: "registration-form",
    fields: ["fullName", "phone", "hasNoPhone"],
  },
  { key: "farm", illustration: "welcome", fields: ["crops", "farmSize"] },
  { key: "location", illustration: "gps-location", fields: [] },
  { key: "contact", illustration: "audio-prompts", fields: [] },
  { key: "money", illustration: "registration-form", fields: [] },
  { key: "help", illustration: "welcome", fields: [] },
] as const satisfies readonly {
  key: string
  illustration: string
  fields: readonly RegistrationField[]
}[]

export type StepKey = (typeof STEPS)[number]["key"]
