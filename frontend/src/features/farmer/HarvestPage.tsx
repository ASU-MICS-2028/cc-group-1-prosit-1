import { useTranslation } from "react-i18next"
import { getHarvestForecast } from "@/api/farmer"
import { RangeChart } from "@/components/Charts"
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
        <section
          aria-labelledby="harvest-chart"
          className="space-y-3 rounded-[20px] border bg-card p-5 md:max-w-2xl"
        >
          <h2
            id="harvest-chart"
            className="text-base font-medium text-foreground"
          >
            {t("farmerApp.harvest.chartTitle")}
          </h2>
          <RangeChart
            title={t("farmerApp.harvest.chartTitle")}
            unit={t("farmerApp.harvest.axis")}
            lowLabel={t("farmerApp.harvest.atLeast")}
            highLabel={t("farmerApp.harvest.couldReach")}
            rowHeader={t("farmerApp.harvest.crop")}
            noteHeader={t("farmerApp.harvest.when")}
            format={(low, high) => t("farmerApp.harvest.range", { low, high })}
            rows={forecast.crops.map((c) => ({
              label: t(`register.crops.${c.crop}`),
              note: t("farmerApp.harvest.ready", {
                month: monthName(c.harvestMonth),
              }),
              low: c.lowBags,
              high: c.highBags,
            }))}
          />
        </section>
      )}
    </FarmerPage>
  )
}
