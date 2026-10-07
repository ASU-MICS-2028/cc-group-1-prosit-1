// The answers on the visit form. Codes are the API's words for the backend code lists
// (FarmerEnums.cs: VisitTopic, FarmObservation; docs/data-dictionary.md section 5).

export const VISIT_TOPICS = [
  "seeds",
  "fertiliser",
  "pests",
  "weather",
  "selling",
  "loans",
  "storage",
] as const
export const FARM_OBSERVATIONS = [
  "all_good",
  "pests",
  "disease",
  "dry_soil",
  "flooding",
] as const
/** When to come back. Kept on the phone to plan the next visit. */
export const NEXT_VISITS = [
  "one_week",
  "two_weeks",
  "one_month",
  "none",
] as const

export type VisitTopic = (typeof VISIT_TOPICS)[number]
export type FarmObservation = (typeof FARM_OBSERVATIONS)[number]
export type NextVisit = (typeof NEXT_VISITS)[number]
