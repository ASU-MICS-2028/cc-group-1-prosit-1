import { Bell, BellOff, TrendingDown, TrendingUp } from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ApiError } from "@/api/client"
import { getAlerts, getPrices, saveAlerts } from "@/api/farmer"
import { AudioButton } from "@/components/AudioButton"
import { BackHeader } from "@/components/Blocks"
import { FieldError } from "@/components/form/FieldError"
import { Picture } from "@/components/Picture"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { NoDataYet } from "./DataStatus"
import { PriceTrend } from "./PriceCharts"
import { cropPicture, money, weekChange, type Crop } from "./prices"
import { useServerData } from "./useServerData"

type Range = 7 | 30

/**
 * Price detail (Figma P2 · 05): today's price and the week's change, the chart for 7 or 30 days, the other
 * markets, and "SMS me when the price changes" (saved in the farmer's SMS alerts).
 */
export function Component() {
  const { t } = useTranslation()
  const crop = useParams().crop as Crop
  const state = useServerData("prices", getPrices)
  const alerts = useServerData("alerts", getAlerts)
  const [range, setRange] = useState<Range>(30)
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const price = state.data?.prices.find((p) => p.crop === crop)
  const name = t(`register.crops.${crop}`)
  const picture = cropPicture(crop)
  const on = subscribed ?? alerts.data?.priceCrops.includes(crop) ?? false

  async function toggle() {
    if (!alerts.data) return
    setSaving(true)
    setProblem(null)
    try {
      const rest = alerts.data.priceCrops.filter((c) => c !== crop)
      const saved = await saveAlerts({
        priceCrops: on ? rest : [...rest, crop],
        heavyRain: alerts.data.heavyRain,
        drySpell: alerts.data.drySpell,
      })
      setSubscribed(saved.priceCrops.includes(crop))
    } catch (error) {
      setProblem(
        error instanceof ApiError ? error.message : t("errors.generic")
      )
    } finally {
      setSaving(false)
    }
  }

  if (!price)
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <BackHeader title={name} to="/farmer/prices" />
        <NoDataYet state={state} />
      </div>
    )

  const main = price.markets[0]
  const change = weekChange(main.pricePerKg, price.weekChangePercent)
  const Arrow = change >= 0 ? TrendingUp : TrendingDown
  const values = price.last30Days.slice(-range)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <BackHeader
        title={name}
        to="/farmer/prices"
        action={
          <AudioButton
            label={t("farmerApp.prices.listen", { crop: name })}
            text={t("farmerApp.prices.speak", {
              crop: name,
              price: money(main.pricePerKg),
              market: main.market,
            })}
            className="size-11 bg-secondary"
          />
        }
      />
      {picture ? (
        <Picture
          source={picture}
          alt=""
          fit="cover"
          className="h-36 w-full rounded-[20px]"
          emojiClassName="mx-auto h-36 w-24"
        />
      ) : null}

      <section className="space-y-1.5 rounded-[20px] bg-cream p-5">
        <p className="text-sm text-muted-foreground">
          {t("farmerApp.prices.atMarket", { market: main.market })}
        </p>
        <p className="text-3xl font-semibold text-foreground tabular-nums">
          {money(main.pricePerKg)}
        </p>
        <p
          className={cn(
            "flex items-center gap-1.5 text-sm font-medium",
            change >= 0 ? "text-primary" : "text-destructive"
          )}
        >
          <Arrow aria-hidden className="size-4" />
          {t(
            change >= 0 ? "farmerApp.prices.upBy" : "farmerApp.prices.downBy",
            {
              amount: money(Math.abs(change)),
              percent: Math.abs(price.weekChangePercent),
            }
          )}
        </p>
      </section>

      <div
        role="group"
        aria-label={t("farmerApp.prices.range")}
        className="flex gap-2"
      >
        {([7, 30] as const).map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={range === r}
            onClick={() => setRange(r)}
            className={cn(
              "h-12 rounded-full px-5 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              range === r
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground"
            )}
          >
            {t("farmerApp.prices.days", { count: r })}
          </button>
        ))}
        <span
          aria-disabled
          title={t("flow.laterPhase")}
          className="flex h-12 items-center rounded-full bg-muted px-5 text-base text-muted-foreground"
        >
          {t("farmerApp.prices.months", { count: 3 })}
        </span>
      </div>

      <section className="rounded-[20px] border bg-card p-4">
        <PriceTrend values={values} money={money} />
      </section>

      {price.markets.length > 1 ? (
        <section aria-labelledby="other-markets" className="space-y-3">
          <h2
            id="other-markets"
            className="text-base font-medium text-foreground"
          >
            {t("farmerApp.prices.nearYou")}
          </h2>
          <ul className="divide-y rounded-[20px] border bg-card">
            {price.markets.slice(1).map((m) => (
              <li
                key={m.market}
                className="flex items-center justify-between px-4 py-3.5"
              >
                <span className="text-base text-foreground">{m.market}</span>
                <span className="text-base font-medium text-foreground tabular-nums">
                  {money(m.pricePerKg)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <FieldError id="alert-error" message={problem ?? undefined} />
      {alerts.data && !alerts.data.hasPhone ? (
        <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-foreground">
          {t("farmerApp.alerts.noPhone")}
        </p>
      ) : (
        <Button
          size="xl"
          variant={on ? "secondary" : "default"}
          className={cn("w-full", on && "text-primary")}
          disabled={saving || !alerts.data}
          onClick={() => void toggle()}
        >
          {on ? <BellOff aria-hidden /> : <Bell aria-hidden />}
          {on ? t("farmerApp.prices.smsOff") : t("farmerApp.prices.smsOn")}
        </Button>
      )}
      {on ? (
        <p role="status" className="text-center text-sm text-primary">
          {t("farmerApp.prices.smsOnNote", { crop: name })}
        </p>
      ) : null}
      <Link
        to="/farmer/alerts"
        className="text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {t("farmerApp.alerts.all")}
      </Link>
    </div>
  )
}
