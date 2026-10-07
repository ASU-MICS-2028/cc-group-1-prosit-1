import { Suspense } from "react"
import { Outlet, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useHideBottomNav } from "@/app/useHideBottomNav"
import { Loading } from "@/app/Loading"
import { BottomNav } from "@/app/nav"
import { farmerNavItems } from "@/app/navItems"
import { clearSession } from "@/auth/session"
import { ScreenShell } from "@/components/ScreenShell"
import { Button } from "@/components/ui/button"
import { FarmerOnComputer } from "@/features/start/FarmerOnComputer"
import { useIsDesktop } from "@/lib/useIsDesktop"
import { cn } from "@/lib/utils"

/**
 * The farmer's app. Farmers are phone only (ADR 0024): under 768 px the phone design with the
 * bottom bar; on a computer the "use your phone" screen (D02f) with the address, a QR code and
 * Log out, instead of farmer screens that were designed for phones.
 */
export function Component() {
  const hide = useHideBottomNav()
  const desktop = useIsDesktop()
  const navigate = useNavigate()
  const { t } = useTranslation()

  if (desktop) {
    return (
      <ScreenShell
        brand={{ tagline: t("start.brand"), illustration: "welcome" }}
      >
        <FarmerOnComputer
          actions={
            <Button
              size="xl"
              variant="secondary"
              className="w-full text-primary"
              onClick={() => {
                clearSession()
                void navigate("/who", { replace: true })
              }}
            >
              {t("common.logOut")}
            </Button>
          }
        />
      </ScreenShell>
    )
  }

  return (
    <div className="min-h-svh bg-background">
      <main
        className={cn(
          "mx-auto w-full max-w-6xl px-4 pt-4 md:px-8 md:pt-7 md:pb-10",
          hide ? "pb-8" : "pb-28"
        )}
      >
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      {hide ? null : <BottomNav items={farmerNavItems} />}
    </div>
  )
}
