import { ChevronDown, MessageSquare, Phone, Play } from "lucide-react"
import { useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { BackHeader, ListRow } from "@/components/Blocks"
import { AudioButton } from "@/components/AudioButton"
import { promptAudio } from "@/lib/audio"

/** The MoFA help line, set per deployment (VITE_HELP_LINE). Without it the call and SMS rows are hidden. */
const HELP_LINE = import.meta.env.VITE_HELP_LINE as string | undefined

const OFFICER_TOPICS = ["register", "noNetwork", "fixRed"] as const
const FARMER_TOPICS = ["myDetails", "noNetwork", "whoToCall"] as const

/**
 * Help (Figma 24): short answers to the common questions, each with a speaker (recordings per
 * language, ADR 0014), then the help line when one is configured.
 */
export function Component() {
  const { t } = useTranslation()
  const farmer = useLocation().pathname.startsWith("/farmer")
  const topics = farmer ? FARMER_TOPICS : OFFICER_TOPICS

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <BackHeader
        title={t("help.title")}
        to={farmer ? "/farmer/profile" : "/profile"}
      />
      <div className="flex h-45 items-center justify-center rounded-[30px] bg-cream">
        <img
          src="/illustrations/help-community.svg"
          alt=""
          decoding="async"
          className="h-40 w-auto"
        />
      </div>
      <h2 className="text-2xl leading-9 font-semibold text-foreground">
        {t("help.question")}
      </h2>
      <div className="space-y-3">
        {topics.map((topic) => (
          <details key={topic} className="group rounded-xl border bg-card">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
              >
                <Play className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-medium text-foreground">
                  {t(`help.topics.${topic}.title`)}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {t("help.oneMinute")}
                </span>
              </span>
              <ChevronDown
                aria-hidden
                className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="flex items-start gap-3 border-t px-4 py-3">
              <p className="flex-1 text-sm text-foreground">
                {t(`help.topics.${topic}.text`)}
              </p>
              <AudioButton
                src={promptAudio(`help.${topic}`)}
                label={t(`help.topics.${topic}.title`)}
                className="size-10 bg-secondary"
              />
            </div>
          </details>
        ))}
        {HELP_LINE ? (
          <>
            <a href={`tel:${HELP_LINE}`} className="block">
              <ListRow
                icon={Phone}
                title={t("help.call")}
                subtitle={t("help.callHours")}
              />
            </a>
            <a href={`sms:${HELP_LINE}`} className="block">
              <ListRow
                icon={MessageSquare}
                title={t("help.sms")}
                subtitle={t("help.smsReply")}
              />
            </a>
          </>
        ) : null}
      </div>
    </div>
  )
}
