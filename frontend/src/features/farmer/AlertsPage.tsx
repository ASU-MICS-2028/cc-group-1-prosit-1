import { CloudRain, MessageSquare, Sun } from "lucide-react"
import { useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { ApiError } from "@/api/client"
import {
  getAlerts,
  getMyFarm,
  saveAlerts,
  type AlertSettings,
} from "@/api/farmer"
import { BackHeader } from "@/components/Blocks"
import { FieldError } from "@/components/form/FieldError"
import { Picture } from "@/components/Picture"
import { CROPS } from "@/features/registration/options"
import { cn } from "@/lib/utils"
import { NoDataYet } from "./DataStatus"
import type { Crop } from "./prices"
import { useServerData } from "./useServerData"

/** SMS alerts (Figma P2 · 07): price changes per crop and weather warnings, each a switch saved at once. */
export function Component() {
  const { t } = useTranslation()
  const state = useServerData("alerts", getAlerts)
  const mine = useServerData("me", getMyFarm).data?.farmer.crops ?? []
  const [settings, setSettings] = useState<AlertSettings | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const current = settings ?? state.data
  // The farmer's own crops first, then the rest.
  const crops = [...CROPS].sort(
    (a, b) => Number(mine.includes(b.code)) - Number(mine.includes(a.code))
  )

  async function save(next: AlertSettings) {
    setSettings(next) // show it at once; put it back if the server refuses
    setProblem(null)
    try {
      setSettings(
        await saveAlerts({
          priceCrops: next.priceCrops,
          heavyRain: next.heavyRain,
          drySpell: next.drySpell,
        })
      )
    } catch (error) {
      setSettings(null)
      setProblem(
        error instanceof ApiError ? error.message : t("errors.generic")
      )
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <BackHeader title={t("farmerApp.alerts.title")} />
      <p className="text-sm text-muted-foreground">
        {t("farmerApp.alerts.intro")}
      </p>
      {!current ? (
        <NoDataYet state={state} />
      ) : (
        <>
          {current.hasPhone ? null : (
            <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-foreground">
              {t("farmerApp.alerts.noPhone")}
            </p>
          )}
          <h2 className="text-base font-medium text-foreground">
            {t("farmerApp.alerts.prices")}
          </h2>
          <ul className="space-y-3">
            {crops.map((c) => {
              const on = current.priceCrops.includes(c.code as Crop)
              const name = t(`register.crops.${c.code}`)
              return (
                <AlertRow
                  key={c.code}
                  icon={
                    <Picture
                      source={c.picture}
                      alt=""
                      fit="cover"
                      className="size-11 rounded-full"
                      emojiClassName="size-9"
                    />
                  }
                  title={t("farmerApp.alerts.priceOf", { crop: name })}
                  hint={on ? t("farmerApp.alerts.priceHint") : undefined}
                  on={on}
                  onChange={(next) =>
                    void save({
                      ...current,
                      priceCrops: next
                        ? [...current.priceCrops, c.code as Crop]
                        : current.priceCrops.filter((x) => x !== c.code),
                    })
                  }
                />
              )
            })}
          </ul>
          <h2 className="text-base font-medium text-foreground">
            {t("farmerApp.alerts.weather")}
          </h2>
          <ul className="space-y-3">
            <AlertRow
              icon={
                <Round>
                  <CloudRain className="size-5" />
                </Round>
              }
              title={t("farmerApp.alerts.heavyRain")}
              hint={t("farmerApp.alerts.heavyRainHint")}
              on={current.heavyRain}
              onChange={(next) => void save({ ...current, heavyRain: next })}
            />
            <AlertRow
              icon={
                <Round>
                  <Sun className="size-5" />
                </Round>
              }
              title={t("farmerApp.alerts.drySpell")}
              hint={t("farmerApp.alerts.drySpellHint")}
              on={current.drySpell}
              onChange={(next) => void save({ ...current, drySpell: next })}
            />
          </ul>
          <FieldError id="alerts-error" message={problem ?? undefined} />
          <p className="flex gap-2 rounded-[20px] bg-secondary p-4 text-sm text-primary">
            <MessageSquare aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t("farmerApp.alerts.free")}
          </p>
        </>
      )}
    </div>
  )
}

function Round({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary"
    >
      {children}
    </span>
  )
}

/** One alert: icon, title and hint, and a switch (a real checkbox for screen readers and keyboards). */
function AlertRow({
  icon,
  title,
  hint,
  on,
  onChange,
}: {
  icon: ReactNode
  title: string
  hint?: string
  on: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <li>
      <label className="flex cursor-pointer items-center gap-3 rounded-[20px] border bg-card p-3 pr-4 has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
        {icon}
        <span className="min-w-0 flex-1">
          <span className="block text-base font-medium text-foreground">
            {title}
          </span>
          {hint ? (
            <span className="block text-sm text-muted-foreground">{hint}</span>
          ) : null}
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={on}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={cn(
            "relative h-8 w-14 shrink-0 rounded-full transition-colors",
            on ? "bg-primary" : "bg-muted"
          )}
        >
          <span
            className={cn(
              "absolute top-1 size-6 rounded-full bg-white shadow transition-transform",
              on ? "translate-x-7" : "translate-x-1"
            )}
          />
        </span>
      </label>
    </li>
  )
}
