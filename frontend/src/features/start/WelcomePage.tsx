import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { IllustrationCard } from "@/components/IllustrationCard"
import { ScreenShell } from "@/components/ScreenShell"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** 00 Welcome: what the app is for, then on to choosing a language. */
export function Component() {
  const { t } = useTranslation()

  return (
    <ScreenShell
      className="pt-6"
      brand={{ tagline: t("start.brand"), illustration: "farmer-home" }}
      footer={
        <Link
          to="/country"
          className={cn(buttonVariants({ size: "xl" }), "w-full")}
        >
          {t("start.getStarted")}
        </Link>
      }
    >
      {/* Phone: name and picture on top. Computer: they are in the brand panel. */}
      <p className="text-2xl leading-9 font-semibold text-primary md:hidden">
        {t("app.name")}
      </p>
      <IllustrationCard
        name="farmer-home"
        className="h-82.5 p-2.5 md:hidden"
        imageClassName="h-77.5"
      />
      <div className="space-y-2">
        <h1 className="text-2xl leading-9 font-semibold text-foreground">
          {t("start.tagline")}
        </h1>
        <p className="text-base text-muted-foreground">{t("start.intro")}</p>
      </div>
    </ScreenShell>
  )
}
