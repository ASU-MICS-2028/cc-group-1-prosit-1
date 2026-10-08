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

/**
 * Weather (Figma P2 · D2): today with the farm advice, then the next 7 days as a list, one row per day
 * (day, sky, chance of rain, high and low), so every day is visible on a phone without scrolling sideways.
 */
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
                  {t("farmerApp.weather.highLow", {
                    max: weather.today.maxC,
                    min: weather.today.minC,
                  })}
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

          <section
            aria-labelledby="weather-next"
            className="space-y-3 md:max-w-2xl"
          >
            <SectionTitle id="weather-next">
              {t("farmerApp.weather.next")}
            </SectionTitle>
            <ul className="divide-y rounded-[20px] border bg-card">
              {weather.nextDays.map((day) => (
                <li
                  key={day.date}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="w-10 shrink-0 text-base font-medium text-foreground">
                    {weekday(day.date)}
                  </span>
                  <WeatherIcon condition={day.condition} />
                  <span className="min-w-0 flex-1 space-y-1.5">
                    <span className="block text-sm text-foreground">
                      {t(`farmerApp.weather.conditions.${day.condition}`)}
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-full max-w-28 overflow-hidden rounded-full bg-secondary"
                      >
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{ width: `${day.rainChancePercent}%` }}
                        />
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {t("farmerApp.weather.rain", {
                          percent: day.rainChancePercent,
                        })}
                      </span>
                    </span>
                  </span>
                  <span className="sr-only">
                    {t("farmerApp.weather.highLow", {
                      max: day.maxC,
                      min: day.minC,
                    })}
                  </span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-right tabular-nums"
                  >
                    <span className="text-lg font-medium text-foreground">
                      {day.maxC}°
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {" "}
                      / {day.minC}°
                    </span>
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
