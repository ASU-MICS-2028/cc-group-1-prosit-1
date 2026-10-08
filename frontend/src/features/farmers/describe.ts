import type { TFunction } from "i18next"
import type { LocalFarmer } from "@/db/local"

/**
 * What the descriptions need from a farmer: the record kept on the officer's device, or the farmer's own
 * record from the server (the farmer app maps its few nullable fields first).
 */
export type FarmerFacts = Pick<
  LocalFarmer,
  | "fullName"
  | "phoneE164"
  | "gender"
  | "ageBand"
  | "community"
  | "regionDistrict"
  | "crops"
  | "farmSize"
  | "farmSizeUnit"
  | "soil"
  | "latitude"
  | "longitude"
  | "locationAccuracyMetres"
  | "phoneType"
  | "reachChannels"
  | "mobileMoney"
  | "helpNeeded"
>

/** The answers of a farmer as short labelled lines, shared by the detail pages, the preview and Listen. */
export function farmerFacts(farmer: FarmerFacts, t: TFunction) {
  const list = (items: string[]) => items.join(", ")
  const size = t(`register.review.${farmer.farmSizeUnit}`, {
    count: farmer.farmSize,
  })
  const soil = farmer.soil
    ? t(`register.soils.${farmer.soil}`).toLowerCase()
    : null
  return {
    phone: farmer.phoneE164
      ? `${farmer.phoneE164.slice(0, 4)} ${farmer.phoneE164.slice(4, 6)} ${farmer.phoneE164.slice(6, 9)} ${farmer.phoneE164.slice(9)}`
      : t("register.review.noPhone"),
    genderAge: list(
      [
        farmer.gender && t(`register.genders.${farmer.gender}`),
        farmer.ageBand && t(`register.ages.${farmer.ageBand}`),
      ].filter((x): x is string => !!x)
    ),
    community: list([farmer.community, farmer.regionDistrict].filter(Boolean)),
    crops: list(farmer.crops.map((c) => t(`register.crops.${c}`))),
    size: soil ? `${size}, ${soil}` : size,
    location:
      farmer.latitude !== null && farmer.longitude !== null
        ? `${farmer.latitude.toFixed(2)}, ${farmer.longitude.toFixed(2)}${
            farmer.locationAccuracyMetres !== null
              ? ` (±${farmer.locationAccuracyMetres} m)`
              : ""
          }`
        : t("register.review.noLocation"),
    phoneType: farmer.phoneType
      ? t(`register.phoneTypes.${farmer.phoneType}`)
      : null,
    reachBy: list(farmer.reachChannels.map((c) => t(`register.channels.${c}`))),
    mobileMoney:
      farmer.mobileMoney && farmer.mobileMoney !== "skip"
        ? t(`register.mobileMoneyAnswers.${farmer.mobileMoney}`)
        : null,
    needs: list(farmer.helpNeeded.map((h) => t(`register.helpNeeds.${h}`))),
  }
}

/** One paragraph to read aloud (Listen to this profile). */
export function farmerSpeech(farmer: FarmerFacts, t: TFunction): string {
  const f = farmerFacts(farmer, t)
  return [
    farmer.fullName,
    f.community,
    f.genderAge,
    `${t("farmers.facts.phone")}: ${f.phone}`,
    f.crops && `${t("farmers.facts.crops")}: ${f.crops}`,
    `${t("farmers.facts.size")}: ${f.size}`,
    f.needs && `${t("farmers.facts.needs")}: ${f.needs}`,
  ]
    .filter(Boolean)
    .join(". ")
}
