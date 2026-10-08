import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ScreenShell } from "@/components/ScreenShell"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FarmerOnComputer } from "./FarmerOnComputer"

/** D02f, reached from the desktop "Who are you?" ("Farmer? The farmer app works on your phone"). */
export function Component() {
  const { t } = useTranslation()

  return (
    <ScreenShell
      brand={{ tagline: t("start.brand"), illustration: "farmer-home" }}
    >
      <FarmerOnComputer
        actions={
          <Link
            to="/who"
            className={cn(
              buttonVariants({ size: "xl", variant: "secondary" }),
              "w-full text-primary"
            )}
          >
            {t("common.back")}
          </Link>
        }
      />
    </ScreenShell>
  )
}
