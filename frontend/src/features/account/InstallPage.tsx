import { Download, Share, SquarePlus } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { isInstalled, useInstallPrompt } from "@/app/pwa/useInstallPrompt"
import { BackHeader } from "@/components/Blocks"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Platform = "android" | "iphone"

/** iPhones and iPads have no install button: they need Share → Add to Home Screen. */
function guessPlatform(): Platform {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ? "iphone" : "android"
}

/**
 * Put AgroConnect on your home screen (Figma 22): why, and three steps for Android or iPhone.
 * On Android (and computers) Install opens the browser's own install question.
 */
export function Component() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { available, install } = useInstallPrompt()
  const [platform, setPlatform] = useState<Platform>(guessPlatform)
  const installed = isInstalled()

  const steps =
    platform === "android"
      ? [
          { text: t("install.android1"), icon: Download },
          { text: t("install.android2"), icon: SquarePlus },
          { text: t("install.open"), icon: Share },
        ]
      : [
          { text: t("install.iphone1"), icon: Share },
          { text: t("install.iphone2"), icon: SquarePlus },
          { text: t("install.open"), icon: Download },
        ]

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <BackHeader title={t("app.name")} tone="green" />
      <div className="flex h-50 items-center justify-center rounded-[30px] bg-cream">
        <img
          src="/illustrations/audio-prompts.svg"
          alt=""
          decoding="async"
          className="h-47.5 w-auto"
        />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl leading-9 font-semibold text-foreground">
          {t("install.heading")}
        </h2>
        <p className="text-base text-muted-foreground">{t("install.why")}</p>
      </div>

      {installed ? (
        <p
          role="status"
          className="rounded-xl bg-secondary px-4 py-3 font-medium text-primary"
        >
          {t("install.done")}
        </p>
      ) : (
        <>
          <div
            role="radiogroup"
            aria-label={t("install.phoneType")}
            className="flex gap-2"
          >
            {(["android", "iphone"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={platform === p}
                onClick={() => setPlatform(p)}
                className={cn(
                  "h-12 rounded-full px-5 text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  platform === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground"
                )}
              >
                {t(`install.${p}`)}
              </button>
            ))}
          </div>
          <ol className="space-y-3">
            {steps.map(({ text, icon: Icon }, index) => (
              <li
                key={text}
                className="flex items-center gap-3 rounded-xl border bg-card px-3 py-3"
              >
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-base font-medium text-primary-foreground"
                >
                  {index + 1}
                </span>
                <span className="flex-1 text-base text-foreground">{text}</span>
                <Icon aria-hidden className="size-5 shrink-0 text-primary" />
              </li>
            ))}
          </ol>
          {platform === "android" ? (
            <Button
              size="xl"
              disabled={!available}
              onClick={() =>
                void install().then((ok) => (ok ? navigate(-1) : undefined))
              }
            >
              {t("install.button")}
            </Button>
          ) : null}
          {platform === "android" && !available ? (
            <p className="text-sm text-muted-foreground">
              {t("install.notOffered")}
            </p>
          ) : null}
        </>
      )}
      <Button
        size="xl"
        variant="secondary"
        className="text-primary"
        onClick={() => void navigate(-1)}
      >
        {t("install.notNow")}
      </Button>
    </div>
  )
}
