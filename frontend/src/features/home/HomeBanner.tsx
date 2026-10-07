import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { FieldArt } from "@/components/FieldArt"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * "Ready to register a new farmer" (Figma 03 / D04 banner): the fields, the officer at work, and
 * the words as real text so every language can say them. Phones: the whole banner is the link.
 * Computers: a "Start registration" button.
 */
export function HomeBanner() {
  const { t } = useTranslation()

  const words = (
    <div className="relative z-10 flex max-w-[60%] flex-col items-start gap-1.5 md:max-w-[55%] md:gap-2">
      <span className="text-base leading-6 font-medium text-primary md:text-2xl md:leading-9">
        {t("home.readyTo")}
      </span>
      <span className="bg-primary py-1 pr-5 pl-3 text-lg leading-7 font-semibold text-primary-foreground [clip-path:polygon(0_0,100%_0,92%_50%,100%_100%,0_100%)] md:hidden">
        {t("home.registerWord")}
      </span>
      <span className="font-serif text-lg leading-7 text-[#b8573c] italic md:text-2xl md:leading-9 lg:text-3xl lg:leading-10">
        <span className="md:hidden">{t("home.aNewFarmer")}</span>
        <span className="hidden md:inline">{t("home.registerANewFarmer")}</span>
      </span>
    </div>
  )

  return (
    <section className="relative isolate h-40 overflow-hidden rounded-[30px] bg-cream md:h-55">
      <FieldArt className="absolute inset-0 -z-10 size-full" />
      <img
        src="/illustrations/agent-home.svg"
        alt=""
        decoding="async"
        // The picture has its own sky; fading its left edge blends it into the fields.
        className="absolute right-0 bottom-0 h-full w-auto max-w-[62%] mask-[linear-gradient(to_right,transparent,black_30%)] object-contain object-right-bottom md:max-w-[45%]"
      />
      {/* Phone: tap anywhere */}
      <Link
        to="/register"
        className="absolute inset-0 flex items-start p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
      >
        {words}
        <span className="sr-only">{t("home.register")}</span>
      </Link>
      {/* Computer: words and a button */}
      <div className="absolute inset-0 hidden flex-col items-start justify-between p-9 md:flex">
        {words}
        <Link
          to="/register"
          className={cn(buttonVariants({ size: "xl" }), "relative z-10 w-60")}
        >
          {t("home.startRegistration")}
        </Link>
      </div>
    </section>
  )
}
