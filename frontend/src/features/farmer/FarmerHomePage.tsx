import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ScreenShell } from "@/components/ScreenShell"
import { Button } from "@/components/ui/button"
import { clearSession, useSession } from "@/auth/session"

/** The farmer's home. The full design (23 Farmer Home) is built with the farmer screens. */
export function Component() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const session = useSession()

  return (
    <ScreenShell
      className="pt-6"
      footer={
        <Button
          size="xl"
          variant="secondary"
          className="w-full"
          onClick={() => {
            clearSession()
            void navigate("/who", { replace: true })
          }}
        >
          {t("common.logOut")}
        </Button>
      }
    >
      <p className="text-2xl leading-9 font-semibold text-primary">
        {t("app.name")}
      </p>
      <h1 className="text-2xl leading-9 font-semibold text-foreground">
        {t("farmerHome.hello", { name: session?.user.fullName ?? "" })}
      </h1>
    </ScreenShell>
  )
}
