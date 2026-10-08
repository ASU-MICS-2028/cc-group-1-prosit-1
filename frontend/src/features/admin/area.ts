import { useTranslation } from "react-i18next"
import { useSession } from "@/auth/session"

/** "MoFA, Northern Region": the area the admin looks after. */
export function useAdminArea() {
  const { t } = useTranslation()
  const user = useSession()?.user
  if (user?.district)
    return t("admin.areaDistrict", { district: user.district })
  if (user?.region) return t("admin.areaRegion", { region: user.region })
  return t("admin.areaNational")
}
