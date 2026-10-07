import { useTranslation } from "react-i18next"
import { useSession } from "@/auth/session"
import { ProfileView } from "@/features/account/ProfileView"

/** The officer's Profile (Figma 16 / D19). */
export function Component() {
  const { t } = useTranslation()
  const user = useSession()?.user

  return (
    <ProfileView
      name={user?.fullName ?? ""}
      subtitle={[t("profile.officerRole"), user?.district]
        .filter(Boolean)
        .join(" · ")}
      base=""
      officer
    />
  )
}
