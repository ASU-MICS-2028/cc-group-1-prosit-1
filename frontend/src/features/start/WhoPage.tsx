import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { BackButton } from "@/components/BackButton"
import { QuestionTitle } from "@/components/QuestionTitle"
import { ScreenShell } from "@/components/ScreenShell"

const roles = [
  {
    to: "/login/officer",
    icon: "user-check",
    title: "who.officer",
    hint: "who.officerHint",
  },
  {
    to: "/login/farmer",
    icon: "sprout",
    title: "who.farmer",
    hint: "who.farmerHint",
  },
] as const

/** 01b Who are you?: officers and farmers get different apps after sign-in. */
export function Component() {
  const { t } = useTranslation()

  return (
    <ScreenShell brand={{ tagline: t("start.brand"), illustration: "welcome" }}>
      <BackButton to="/language" />
      <div className="space-y-1">
        <QuestionTitle title={t("who.title")} audioKey="who" size="page" />
        <p className="text-base text-muted-foreground">{t("who.subtitle")}</p>
      </div>

      <ul className="space-y-3.5">
        {roles.map((role) => (
          <li key={role.to}>
            <Link
              to={role.to}
              className="flex items-center gap-3.5 rounded-3xl border bg-card p-4 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary">
                <img
                  src={`/icons/${role.icon}.svg`}
                  alt=""
                  className="size-7"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xl leading-[30px] font-medium text-foreground">
                  {t(role.title)}
                </span>
                <span className="block text-sm font-medium text-muted-foreground">
                  {t(role.hint)}
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className="size-[22px] text-muted-foreground"
              />
            </Link>
          </li>
        ))}
      </ul>

      <p className="flex items-center gap-3 rounded-2xl bg-cream py-3 pr-3.5 pl-3 text-sm font-medium text-foreground">
        <img src="/icons/monitor.svg" alt="" className="size-[22px] shrink-0" />
        {t("who.office")}
      </p>
    </ScreenShell>
  )
}
