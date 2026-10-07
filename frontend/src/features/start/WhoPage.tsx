import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { BackButton } from "@/components/BackButton"
import { QuestionTitle } from "@/components/QuestionTitle"
import { ScreenShell } from "@/components/ScreenShell"
import { useIsDesktop } from "@/lib/useIsDesktop"

interface Role {
  to: string
  icon: string
  title: "who.officer" | "who.farmer" | "who.admin"
  hint: "who.officerHint" | "who.farmerHint" | "who.adminHint"
}

const officer: Role = {
  to: "/login/officer",
  icon: "user-check",
  title: "who.officer",
  hint: "who.officerHint",
}
const farmer: Role = {
  to: "/login/farmer",
  icon: "sprout",
  title: "who.farmer",
  hint: "who.farmerHint",
}
const admin: Role = {
  to: "/login/admin",
  icon: "bank",
  title: "who.admin",
  hint: "who.adminHint",
}

/**
 * 01b / D02a Who are you? The screen width decides the choices (ADR 0024):
 * - phone: Extension officer or Farmer, with a line telling MoFA admins to use a computer;
 * - computer: Extension officer or MoFA admin; farmers are phone only and get a line to the
 *   "use your phone" screen instead of a choice that would lead nowhere.
 */
export function Component() {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  const roles = desktop ? [officer, admin] : [officer, farmer]

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
                <span className="block text-xl leading-7.5 font-medium text-foreground">
                  {t(role.title)}
                </span>
                <span className="block text-sm font-medium text-muted-foreground">
                  {t(role.hint)}
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className="size-5.5 text-muted-foreground"
              />
            </Link>
          </li>
        ))}
      </ul>

      {desktop ? (
        <Link
          to="/farmer-on-computer"
          className="text-base font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {t("who.farmerOnComputer")}
        </Link>
      ) : (
        <p className="flex items-center gap-3 rounded-2xl bg-cream py-3 pr-3.5 pl-3 text-sm font-medium text-foreground">
          <img src="/icons/monitor.svg" alt="" className="size-5.5 shrink-0" />
          {t("who.office")}
        </p>
      )}
    </ScreenShell>
  )
}
