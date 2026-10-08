import { useTranslation } from "react-i18next"
import { isToday } from "@/lib/dates"
import { maskPhone } from "@/lib/phone"
import type { FarmerSummary } from "./farmers"

/** The second line of a farmer row: why it needs fixing, "added today", or village and masked phone. */
export function useFarmerDetail(farmer: FarmerSummary): string {
  const { t } = useTranslation()
  if (farmer.status === "failed")
    return farmer.problem ?? t("farmers.checkDetails")
  const parts = [farmer.village]
  if (farmer.createdAt && isToday(farmer.createdAt))
    parts.push(t("farmers.addedToday"))
  else if (farmer.phone) parts.push(maskPhone(farmer.phone))
  return parts.filter(Boolean).join(" · ")
}
