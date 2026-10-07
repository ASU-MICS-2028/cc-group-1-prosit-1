import {
  CheckCheck,
  ChevronRight,
  ClipboardList,
  Pencil,
  Phone,
  Volume2,
  Wallet,
} from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { getMyFarm, getWeather } from "@/api/farmer"
import { useSession } from "@/auth/session"
import { AudioButton } from "@/components/AudioButton"
import { ListRow, SectionTitle } from "@/components/Blocks"
import { FieldArt } from "@/components/FieldArt"
import { Picture, type PictureSource } from "@/components/Picture"
import { farmerSpeech } from "@/features/farmers/describe"
import { Avatar } from "@/features/farmers/FarmerRow"
import { promptAudio } from "@/lib/audio"
import { formatShortDate } from "@/lib/dates"
import { maskPhone } from "@/lib/phone"
import { speak } from "@/lib/speech"
import { cn } from "@/lib/utils"
import { toFacts } from "./profile"
import { useServerData } from "./useServerData"
import { WeatherIcon } from "./WeatherIcon"

const SERVICES: {
  key:
    "prices" | "weather" | "cropCheck" | "harvest" | "cooperative" | "lessons"
  to: string
  picture: PictureSource
  tone: string
}[] = [
  {
    key: "prices",
    to: "/farmer/prices",
    picture: { photo: "options/trading", emoji: "chart-increasing" },
    tone: "bg-secondary",
  },
  {
    key: "weather",
    to: "/farmer/weather",
    picture: { photo: "options/rainy", emoji: "sun-behind-rain-cloud" },
    tone: "bg-cream",
  },
  {
    key: "cropCheck",
    to: "/farmer/crop-check",
    picture: { photo: "options/pests", emoji: "magnifying-glass" },
    tone: "bg-cream",
  },
  {
    key: "harvest",
    to: "/farmer/harvest",
    picture: { photo: "options/corn", emoji: "ear-of-corn" },
    tone: "bg-secondary",
  },
  {
    key: "cooperative",
    to: "/farmer/cooperative",
    picture: { photo: "options/cooperative", emoji: "handshake" },
    tone: "bg-secondary",
  },
  {
    key: "lessons",
    to: "/farmer/lessons",
    picture: { photo: "options/phone", emoji: "television" },
    tone: "bg-cream",
  },
]

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
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {SERVICES.map(({ key, to, picture, tone }) => (
              <li key={key}>
                <Link
                  to={to}
                  className={cn(
                    "flex h-full flex-col gap-2 rounded-[20px] p-3 outline-none transition-[filter] hover:brightness-[0.97] focus-visible:ring-3 focus-visible:ring-ring/50",
                    tone
                  )}
                >
                  <Picture
                    source={picture}
                    fit="contain"
                    className="h-16 w-full rounded-2xl bg-card/70 p-1.5 md:h-20"
                    emojiClassName="mx-auto h-16 w-12 md:h-20"
                  />
                  <span className="text-base leading-6 font-medium text-foreground">
                    {t(`farmerApp.tiles.${key}`)}
                  </span>
                  <span className="text-sm leading-5 text-muted-foreground">
                    {t(`farmerApp.tiles.${key}Hint`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to="/farmer/money"
            className="flex items-center gap-3 rounded-[20px] bg-primary p-4 text-primary-foreground outline-none hover:brightness-110 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span
              aria-hidden
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15"
            >
              <Wallet className="size-5.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium">
                {t("farmerApp.tiles.money")}
              </span>
              <span className="block text-sm opacity-90">
                {t("farmerApp.tiles.moneyHint")}
              </span>
            </span>
            <ChevronRight aria-hidden className="size-5 shrink-0" />
          </Link>
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
