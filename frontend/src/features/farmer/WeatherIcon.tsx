import { Cloud, CloudLightning, CloudRain, CloudSun, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { WeatherDay } from "@/api/farmer"
import { cn } from "@/lib/utils"

const ICONS = {
  sunny: Sun,
  partly_cloudy: CloudSun,
  cloudy: Cloud,
  rain: CloudRain,
  storm: CloudLightning,
} as const

/** The weather as a round icon (Figma P2 · D2), with its name for screen readers. */
export function WeatherIcon({
  condition,
  className,
}: {
  condition: WeatherDay["condition"]
  className?: string
}) {
  const { t } = useTranslation()
  const Icon = ICONS[condition]
  const wet = condition === "rain" || condition === "storm"
  return (
    <span
      role="img"
      aria-label={t(`farmerApp.weather.conditions.${condition}`)}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary",
        wet ? "text-primary" : "text-warning",
        className
      )}
    >
      <Icon aria-hidden className="size-1/2" />
    </span>
  )
}
