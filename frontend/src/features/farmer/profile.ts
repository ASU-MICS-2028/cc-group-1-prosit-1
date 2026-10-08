import type { FarmerProfile } from "@/api/farmer"
import type { FarmerFacts } from "@/features/farmers/describe"

/** The farmer's record from the server, in the shape the shared descriptions read (empty text for missing). */
export function toFacts(p: FarmerProfile): FarmerFacts {
  return {
    fullName: p.fullName,
    phoneE164: p.phoneE164,
    gender: p.gender,
    ageBand: p.ageBand,
    community: p.community ?? "",
    regionDistrict: p.regionDistrict ?? "",
    crops: p.crops,
    farmSize: p.farmSize ?? 0,
    farmSizeUnit: p.farmSizeUnit,
    soil: p.soil,
    latitude: p.latitude,
    longitude: p.longitude,
    locationAccuracyMetres: p.locationAccuracyMetres,
    phoneType: p.phoneType,
    reachChannels: p.reachChannels,
    mobileMoney: p.mobileMoney,
    helpNeeded: p.helpNeeded,
  }
}
