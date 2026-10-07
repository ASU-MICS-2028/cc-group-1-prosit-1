import { useTranslation } from "react-i18next"
import { getHarvestForecast } from "@/api/farmer"
import i18n from "@/i18n"
import { NoDataYet } from "./DataStatus"
import { FarmerPage } from "./FarmerPage"
import { useServerData } from "./useServerData"

/** "September" for month 9, in the app language. */
function monthName(month: number) {
  return new Intl.DateTimeFormat([`${i18n.language}-GH`, "en-GB"], {
    month: "long",
  }).format(new Date(2026, month - 1, 15))
}

/** Harvest forecast: per crop, the bags the farm could give this season and when it is usually ready. */
export function Component() {
  const { t } = useTranslation()
  const state = useServerData("harvest", getHarvestForecast)
  const forecast = state.data

  return (
    <FarmerPage
      title={t("farmerApp.harvest.title")}
      source={forecast?.source}
      state={state}
    >
      <p className="text-base text-muted-foreground">
        {t("farmerApp.harvest.intro")}
      </p>
      {!forecast ? (
        <NoDataYet state={state} />
      ) : forecast.crops.length === 0 ? (
        <p className="rounded-[20px] border border-dashed p-6 text-center text-muted-foreground">
          {t("farmerApp.harvest.none")}
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {forecast.crops.map((c) => (
            <li
              key={c.crop}
              className="space-y-1 rounded-[20px] border bg-card p-5"
            >
              <p className="text-base font-medium text-foreground">
                {t(`register.crops.${c.crop}`)}
              </p>
              <p className="text-2xl font-semibold text-primary">
                {t("farmerApp.harvest.bags", {
                  low: c.lowBags,
                  high: c.highBags,
                })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("farmerApp.harvest.ready", {
                  month: monthName(c.harvestMonth),
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </FarmerPage>
  )
}
