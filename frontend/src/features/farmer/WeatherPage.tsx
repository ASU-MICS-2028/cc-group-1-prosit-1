import { useTranslation } from "react-i18next"
import { getWeather } from "@/api/farmer"
import { SectionTitle } from "@/components/Blocks"
import i18n from "@/i18n"
import { formatTime } from "@/lib/dates"
import { NoDataYet } from "./DataStatus"
import { FarmerPage } from "./FarmerPage"
import { useServerData } from "./useServerData"
import { WeatherIcon } from "./WeatherIcon"

/** "Tue" for a day like "2026-10-06", in the app language. */
function weekday(date: string) {
  return new Intl.DateTimeFormat([`${i18n.language}-GH`, "en-GB"], {
    weekday: "short",
  }).format(new Date(`${date}T12:00:00Z`))
}

/** Weather (Figma P2 · D2): today with the farm advice, then the next 7 days. */
export function Component() {
  const { t } = useTranslation()
  const state = useServerData("weather", getWeather)
  const weather = state.data

  return (
    <FarmerPage
      title={
        weather
          ? t("farmerApp.weather.forPlace", { place: weather.place })
          : t("farmerApp.weather.title")
      }
      source={weather?.source}
      state={state}
      wide
    >
      {!weather ? (
        <NoDataYet state={state} />
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-[30px] bg-cream p-5 md:flex-row md:items-center md:p-6">
            <div className="flex flex-1 items-center gap-4">
              <WeatherIcon
                condition={weather.today.condition}
                className="size-18 bg-card [&_svg]:size-9"
              />
              <div>
                <p className="text-2xl font-medium text-foreground">
                  {weather.today.maxC}°C ·{" "}
                  {t(`farmerApp.weather.conditions.${weather.today.condition}`)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("farmerApp.weather.rain", {
                    percent: weather.today.rainChancePercent,
                  })}{" "}
                  · {formatTime(weather.updatedAt)}
                </p>
              </div>
            </div>
            <p className="rounded-2xl bg-card px-4 py-3 text-base text-primary md:max-w-md">
              {t(`farmerApp.weather.advice.${weather.advice}`)}
            </p>
          </section>

          <section aria-labelledby="weather-next" className="space-y-3">
            <SectionTitle id="weather-next">
              {t("farmerApp.weather.next")}
            </SectionTitle>
            <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-7 md:overflow-visible md:px-0">
              {weather.nextDays.map((day) => (
                <li
                  key={day.date}
                  className="flex w-24 shrink-0 snap-start flex-col items-center gap-2 rounded-[20px] border bg-card px-2 py-4 md:w-auto"
                >
                  <span className="text-sm text-muted-foreground">
                    {weekday(day.date)}
                  </span>
                  <WeatherIcon condition={day.condition} />
                  <span className="text-xl font-medium text-foreground">
                    {day.maxC}°
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("farmerApp.weather.rain", {
                      percent: day.rainChancePercent,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </FarmerPage>
  )
}
