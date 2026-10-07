import { CalendarDays, MapPin, Phone, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import { getCooperative } from "@/api/farmer"
import { buttonVariants } from "@/components/ui/button"
import { formatLongDate } from "@/lib/dates"
import { maskPhone } from "@/lib/phone"
import { cn } from "@/lib/utils"
import { NoDataYet } from "./DataStatus"
import { FarmerPage } from "./FarmerPage"
import { useServerData } from "./useServerData"

/** My cooperative: who leads it, how many members, and when and where it meets next. */
export function Component() {
  const { t } = useTranslation()
  const state = useServerData("cooperative", getCooperative)
  const coop = state.data

  return (
    <FarmerPage
      title={t("farmerApp.cooperative.title")}
      source={coop?.source}
      state={state}
    >
      {!coop ? (
        <NoDataYet state={state} />
      ) : (
        <>
          <section className="space-y-1 rounded-[30px] bg-cream p-5">
            <h2 className="text-xl font-medium text-foreground">{coop.name}</h2>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users aria-hidden className="size-4" />
              {t("farmerApp.cooperative.members", { count: coop.members })}
            </p>
          </section>
          <div className="grid gap-4 md:grid-cols-2">
            <section className="space-y-2 rounded-[20px] border bg-card p-5">
              <h3 className="flex items-center gap-2 text-base font-medium text-foreground">
                <CalendarDays aria-hidden className="size-5 text-primary" />
                {t("farmerApp.cooperative.nextMeeting")}
              </h3>
              <p className="text-lg text-foreground">
                {formatLongDate(`${coop.nextMeeting}T12:00:00Z`)}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin aria-hidden className="size-4" />
                {coop.meetingPlace}
              </p>
            </section>
            <section className="space-y-3 rounded-[20px] border bg-card p-5">
              <h3 className="text-base font-medium text-foreground">
                {t("farmerApp.cooperative.chair")}
              </h3>
              <p className="text-lg text-foreground">
                {coop.chairName}
                <span className="block text-sm text-muted-foreground">
                  {maskPhone(coop.chairPhoneE164)}
                </span>
              </p>
              <a
                href={`tel:${coop.chairPhoneE164}`}
                className={cn(
                  buttonVariants({ size: "xl", variant: "secondary" }),
                  "w-full text-primary"
                )}
              >
                <Phone aria-hidden />
                {t("farmerApp.cooperative.call")}
              </a>
            </section>
          </div>
        </>
      )}
    </FarmerPage>
  )
}
