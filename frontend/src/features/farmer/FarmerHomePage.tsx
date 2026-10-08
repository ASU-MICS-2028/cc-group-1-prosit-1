import {
  CheckCheck,
  ChevronRight,
  CloudSun,
  Leaf,
  LineChart,
  Pencil,
  Phone,
  Play,
  Store,
  Users,
  Volume2,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  getCooperative,
  getHarvestForecast,
  getLessons,
  getMyFarm,
  getPrices,
  getWeather,
} from "@/api/farmer"
import { useSession } from "@/auth/session"
import { AudioButton } from "@/components/AudioButton"
import { FieldArt } from "@/components/FieldArt"
import { farmerSpeech } from "@/features/farmers/describe"
import { Avatar } from "@/features/farmers/FarmerRow"
import { promptAudio } from "@/lib/audio"
import { maskPhone } from "@/lib/phone"
import { speak } from "@/lib/speech"
import { cn } from "@/lib/utils"
import { toFacts } from "./profile"
import { useServerData } from "./useServerData"

/** One farm service tile, as Figma 23: cream, blue or green, a white icon badge, the live line, and the icon as a faint watermark in the corner. */
function ServiceTile({
  to,
  icon: Icon,
  title,
  line,
  tone,
  ink,
}: {
  to: string
  icon: LucideIcon
  title: string
  /** The live line under the title ("Maize ₵6.50 ↑"); empty until the first answer arrives */
  line?: ReactNode
  /** Tile background */
  tone: string
  /** Icon and line colour */
  ink: string
}) {
  return (
    <li>
      <Link
        to={to}
        className={cn(
          "relative isolate flex h-full min-h-31 flex-col gap-2 overflow-hidden rounded-[20px] p-3 outline-none transition-[filter] hover:brightness-[0.97] focus-visible:ring-3 focus-visible:ring-ring/50",
          tone
        )}
      >
        {/* Figma "Watermark": the tile's icon, large, tilted and faint, cut off at the bottom right */}
        <Icon
          aria-hidden
          className={cn(
            "absolute -right-2.5 -bottom-4.5 -z-10 size-17 -rotate-14 opacity-[0.13]",
            ink
          )}
        />
        <span
          aria-hidden
          className="flex size-9.5 items-center justify-center rounded-full bg-card"
        >
          <Icon className={cn("size-5", ink)} />
        </span>
        <span className="mt-auto text-[13px] leading-[17px] font-semibold text-foreground">
          {title}
        </span>
        <span
          className={cn("min-h-4 text-[11px] leading-[15px] font-medium", ink)}
        >
          {line}
        </span>
      </Link>
    </li>
  )
}

/** One row of the actions card: an icon in a green circle, a title, a hint and a chevron. */
function ActionRow({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon
  title: string
  hint: string
}) {
  return (
    <>
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium text-foreground">
          {title}
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          {hint}
        </span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-foreground" />
    </>
  )
}

const rowClass =
  "flex w-full items-center gap-3 px-4 py-3 text-left outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"

/**
 * The farmer's home (Figma 23): Akwaaba, the "Registered with MoFA" banner, their card, six farm service
 * tiles with a live line each (from the last saved answer, so they work offline), then listen, change
 * and call their agent.
 */
export function Component() {
  const { t } = useTranslation()
  const user = useSession()?.user
  const name = user?.fullName ?? ""
  const farm = useServerData("me", getMyFarm)
  const prices = useServerData("prices", getPrices).data
  const weather = useServerData("weather", getWeather).data
  const harvest = useServerData("harvest", getHarvestForecast).data
  const cooperative = useServerData("cooperative", getCooperative).data
  const lessons = useServerData("lessons", getLessons).data
  const officer = farm.data?.officer
  // Read here, not inside the click handler: the compiler tracks what a handler reads, and would read it
  // before the first answer arrives.
  const facts = farm.data ? toFacts(farm.data.farmer) : null

  // The farmer's own first crop leads the prices (the server lists their crops first).
  const price = prices?.prices[0]
  const harvestBags = harvest?.crops.reduce(
    (sum, c) => sum + Math.round((c.lowBags + c.highBags) / 2),
    0
  )

  return (
    <div className="space-y-5">
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
          text={`${t("farmerHome.akwaaba")} ${name.split(" ")[0]}. ${t("farmerHome.youAre")} ${t("farmerHome.registered")} ${t("farmerHome.withMofa")}`}
          className="size-11 bg-secondary"
        />
      </header>

      <section className="relative isolate h-40 min-w-0 overflow-hidden rounded-[30px] bg-cream">
        <FieldArt className="absolute inset-0 -z-10 size-full" />
        <img
          src="/illustrations/farmer-home.svg"
          alt=""
          decoding="async"
          className="absolute right-2 bottom-0 h-[94%] w-auto max-w-[55%] mask-[linear-gradient(to_right,transparent,black_30%)] object-contain"
        />
        <div className="relative flex max-w-[55%] flex-col items-start gap-1.5 p-4">
          <span className="text-base font-medium text-primary">
            {t("farmerHome.youAre")}
          </span>
          <span className="bg-primary py-1 pr-5 pl-3 text-lg font-semibold text-primary-foreground [clip-path:polygon(0_0,100%_0,92%_50%,100%_100%,0_100%)]">
            {t("farmerHome.registered")}
          </span>
          <span className="font-serif text-lg text-[#b8573c] italic">
            {t("farmerHome.withMofa")}
          </span>
        </div>
      </section>

      {/* Their card opens My details: the full record, their officer and their visits. */}
      <Link
        to="/farmer/details"
        aria-label={t("farmerApp.home.openDetails", { name })}
        className="flex items-center gap-4 rounded-[20px] border bg-card p-4 outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar name={name} size="lg" className="size-14" />
        <span className="min-w-0 space-y-1.5">
          <span className="block truncate text-lg font-medium text-foreground">
            {name}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-primary">
            <CheckCheck aria-hidden className="size-4" />
            {t("farmerHome.saved")}
          </span>
        </span>
      </Link>

      <nav aria-label={t("farmerApp.home.services")}>
        <ul className="grid grid-cols-3 gap-3">
          <ServiceTile
            to="/farmer/prices"
            icon={Store}
            title={t("farmerApp.tiles.prices")}
            tone="bg-cream"
            ink="text-[#b8573c]"
            line={
              price ? (
                <>
                  {t("farmerApp.home.priceLine", {
                    crop: t(`register.crops.${price.crop}`),
                    price: price.markets[0]?.pricePerKg.toFixed(2),
                  })}
                  {price.weekChangePercent !== 0 ? (
                    <>
                      <span aria-hidden>
                        {price.weekChangePercent > 0 ? " ↑" : " ↓"}
                      </span>
                      <span className="sr-only">
                        {t(
                          price.weekChangePercent > 0
                            ? "farmerApp.home.priceUp"
                            : "farmerApp.home.priceDown"
                        )}
                      </span>
                    </>
                  ) : null}
                </>
              ) : null
            }
          />
          <ServiceTile
            to="/farmer/weather"
            icon={CloudSun}
            title={t("farmerApp.tiles.weather")}
            tone="bg-info-soft"
            ink="text-info"
            line={
              weather
                ? t("farmerApp.home.weatherLine", {
                    max: weather.today.maxC,
                    condition: t(
                      `farmerApp.weather.conditions.${weather.today.condition}`
                    ),
                  })
                : null
            }
          />
          <ServiceTile
            to="/farmer/crop-check"
            icon={Leaf}
            title={t("farmerApp.tiles.cropCheck")}
            tone="bg-secondary"
            ink="text-primary"
            line={t("farmerApp.home.snapLeaf")}
          />
          <ServiceTile
            to="/farmer/harvest"
            icon={LineChart}
            title={t("farmerApp.tiles.harvest")}
            tone="bg-secondary"
            ink="text-primary"
            line={
              harvestBags !== undefined && harvest!.crops.length > 0
                ? t("farmerApp.home.harvestLine", { count: harvestBags })
                : null
            }
          />
          <ServiceTile
            to="/farmer/cooperative"
            icon={Users}
            title={t("farmerApp.tiles.cooperative")}
            tone="bg-cream"
            ink="text-warning"
            line={
              cooperative
                ? t("farmerApp.home.membersLine", {
                    count: cooperative.members,
                  })
                : null
            }
          />
          <ServiceTile
            to="/farmer/lessons"
            icon={Play}
            title={t("farmerApp.tiles.lessons")}
            tone="bg-info-soft"
            ink="text-info"
            line={
              lessons
                ? t("farmerApp.home.lessonsLine", {
                    count: lessons.lessons.length,
                  })
                : null
            }
          />
        </ul>
      </nav>

      <ul className="divide-y overflow-hidden rounded-[20px] border bg-card">
        <li>
          <button
            type="button"
            disabled={!facts}
            onClick={() => facts && speak(farmerSpeech(facts, t))}
            className={cn(rowClass, "disabled:opacity-60")}
          >
            <ActionRow
              icon={Volume2}
              title={t("farmerApp.rows.listen")}
              hint={t("farmerApp.rows.listenHint")}
            />
          </button>
        </li>
        <li>
          <Link to="/farmer/details/change" className={rowClass}>
            <ActionRow
              icon={Pencil}
              title={t("farmerApp.rows.change")}
              hint={t("farmerApp.rows.changeHint")}
            />
          </Link>
        </li>
        {officer ? (
          <li>
            <a href={`tel:${officer.phoneE164}`} className={rowClass}>
              <ActionRow
                icon={Phone}
                title={t("farmerApp.rows.call")}
                hint={`${officer.fullName.split(" ")[0]} · ${maskPhone(officer.phoneE164)}`}
              />
            </a>
          </li>
        ) : null}
      </ul>
    </div>
  )
}
