import {
  CheckCheck,
  ClipboardList,
  CloudSun,
  Leaf,
  Pencil,
  Phone,
  PlayCircle,
  Store,
  TrendingUp,
  Users,
  Volume2,
} from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { getMyFarm, getWeather } from "@/api/farmer"
import { useSession } from "@/auth/session"
import { AudioButton } from "@/components/AudioButton"
import { ListRow, SectionTitle } from "@/components/Blocks"
import { FieldArt } from "@/components/FieldArt"
import { farmerSpeech } from "@/features/farmers/describe"
import { Avatar } from "@/features/farmers/FarmerRow"
import { promptAudio } from "@/lib/audio"
import { formatShortDate } from "@/lib/dates"
import { maskPhone } from "@/lib/phone"
import { speak } from "@/lib/speech"
import { toFacts } from "./profile"
import { useServerData } from "./useServerData"
import { WeatherIcon } from "./WeatherIcon"

const SERVICES = [
  { key: "prices", to: "/farmer/prices", icon: Store },
  { key: "weather", to: "/farmer/weather", icon: CloudSun },
  { key: "cropCheck", to: "/farmer/crop-check", icon: Leaf },
  { key: "harvest", to: "/farmer/harvest", icon: TrendingUp },
  { key: "cooperative", to: "/farmer/cooperative", icon: Users },
  { key: "lessons", to: "/farmer/lessons", icon: PlayCircle },
] as const

/**
 * The farmer's home (Figma 23): Akwaaba, registered with MoFA, their status, the farm services and their own
 * details. On computers the services sit beside the status, today's weather and the links.
 */
export function Component() {
  const { t } = useTranslation()
  const user = useSession()?.user
  const name = user?.fullName ?? ""
  const farm = useServerData("me", getMyFarm)
  const weather = useServerData("weather", getWeather)
  const officer = farm.data?.officer

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("farmerHome.akwaaba")}
          </p>
          <h1 className="text-2xl leading-9 font-semibold text-primary">
            {name.split(" ")[0]}
          </h1>
        </div>
        <AudioButton
          src={promptAudio("farmerHome.welcome")}
          label={t("farmerHome.listen")}
          className="size-11 bg-secondary"
        />
      </header>

      {/* Phones read top to bottom: banner, status, services, my details (Figma 23). Computers put
          the banner and services on the left, status and my details on the right. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,740fr)_minmax(0,364fr)]">
        <section className="relative isolate h-40 min-w-0 overflow-hidden rounded-[30px] bg-cream md:h-55 lg:col-start-1 lg:row-start-1">
          <FieldArt className="absolute inset-0 -z-10 size-full" />
          <img
            src="/illustrations/farmer-home.svg"
            alt=""
            decoding="async"
            className="absolute right-2 bottom-0 h-[94%] w-auto max-w-[55%] mask-[linear-gradient(to_right,transparent,black_30%)] object-contain"
          />
          <div className="relative flex max-w-[55%] flex-col items-start gap-1.5 p-4 md:gap-2 md:p-9">
            <span className="text-base font-medium text-primary md:text-2xl">
              {t("farmerHome.youAre")}
            </span>
            <span className="bg-primary py-1 pr-5 pl-3 text-lg font-semibold text-primary-foreground [clip-path:polygon(0_0,100%_0,92%_50%,100%_100%,0_100%)] md:text-2xl md:leading-9">
              {t("farmerHome.registered")}
            </span>
            <span className="font-serif text-lg text-[#b8573c] italic md:text-3xl md:leading-10">
              {t("farmerHome.withMofa")}
            </span>
          </div>
        </section>

        <section
          aria-labelledby="farmer-services"
          className="min-w-0 space-y-3 self-start lg:col-start-1 lg:row-start-2"
        >
          <SectionTitle id="farmer-services">
            {t("farmerApp.home.services")}
          </SectionTitle>
          <ul className="grid grid-cols-3 gap-3 md:gap-4">
            {SERVICES.map(({ key, to, icon: Icon }) => (
              <li key={key}>
                <Link
                  to={to}
                  className="flex h-full min-h-24 flex-col items-center justify-center gap-2 rounded-[20px] border bg-card px-2 py-3 text-center outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-28"
                >
                  <span
                    aria-hidden
                    className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary"
                  >
                    <Icon className="size-5.5" />
                  </span>
                  <span className="text-sm leading-5 font-medium text-foreground md:text-base">
                    {t(`farmerApp.tiles.${key}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6 self-start lg:col-start-2 lg:row-start-1">
          <section className="flex items-center gap-4 rounded-[20px] border bg-card p-4">
            <Avatar name={name} size="lg" className="size-16" />
            <div className="min-w-0 space-y-1.5">
              <p className="truncate text-lg font-medium text-foreground">
                {name}
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-primary">
                <CheckCheck aria-hidden className="size-4" />
                {t("farmerHome.saved")}
              </span>
              {farm.data ? (
                <p className="text-sm text-muted-foreground">
                  {t("farmerApp.home.registeredBy", {
                    date: formatShortDate(farm.data.farmer.createdAt),
                    officer:
                      officer?.fullName.split(" ")[0] ??
                      t("farmers.anotherOfficer"),
                  })}
                </p>
              ) : null}
            </div>
          </section>

          {weather.data ? (
            <Link
              to="/farmer/weather"
              className="flex items-center gap-4 rounded-[20px] bg-cream p-4 outline-none hover:brightness-[0.98] focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <WeatherIcon
                condition={weather.data.today.condition}
                className="size-14 bg-card"
              />
              <span className="min-w-0">
                <span className="block text-sm text-muted-foreground">
                  {t("farmerApp.home.todayWeather", {
                    place: weather.data.place,
                  })}
                </span>
                <span className="block text-lg font-medium text-foreground">
                  {weather.data.today.maxC}°C ·{" "}
                  {t(
                    `farmerApp.weather.conditions.${weather.data.today.condition}`
                  )}
                </span>
              </span>
            </Link>
          ) : null}
        </div>

        <section
          aria-labelledby="farmer-mine"
          className="space-y-3 self-start lg:col-start-2 lg:row-start-2"
        >
          <SectionTitle id="farmer-mine">
            {t("farmerApp.home.mine")}
          </SectionTitle>
          <ListRow
            icon={Volume2}
            title={t("farmerApp.rows.listen")}
            subtitle={t("farmerApp.rows.listenHint")}
            onClick={
              farm.data
                ? () => speak(farmerSpeech(toFacts(farm.data!.farmer), t))
                : undefined
            }
          />
          <ListRow
            icon={ClipboardList}
            title={t("farmerApp.rows.details")}
            subtitle={t("farmerApp.rows.detailsHint")}
            to="/farmer/details"
          />
          <ListRow
            icon={Pencil}
            title={t("farmerApp.rows.change")}
            subtitle={t("farmerApp.rows.changeHint")}
            to="/farmer/details/change"
          />
          {officer ? (
            <a
              href={`tel:${officer.phoneE164}`}
              className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <ListRow
                icon={Phone}
                title={t("farmerApp.rows.call")}
                subtitle={`${officer.fullName} · ${maskPhone(officer.phoneE164)}`}
              />
            </a>
          ) : null}
        </section>
      </div>
    </div>
  )
}
