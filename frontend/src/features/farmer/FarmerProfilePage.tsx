import { useTranslation } from "react-i18next"
import { useSession } from "@/auth/session"
import { ProfileView } from "@/features/account/ProfileView"

/** The farmer's Profile (Figma "Farmer · My Profile"). */
export function Component() {
  const { t } = useTranslation()
  const user = useSession()?.user

  return (
    <ProfileView
      name={user?.fullName ?? ""}
      subtitle={[t("profile.farmerRole"), user?.region]
        .filter(Boolean)
        .join(" · ")}
      base="/farmer"
      officer={false}
    />
  )
}
