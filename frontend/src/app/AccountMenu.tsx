import { Menu } from "@base-ui/react/menu"
import {
  ChevronDown,
  CircleHelp,
  CircleUser,
  Download,
  Globe,
  LogOut,
} from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useSession } from "@/auth/session"
import { LogoutSheet } from "@/features/account/LogoutSheet"
import { countByStatus, useFarmers } from "@/features/farmers/farmers"
import { initials } from "@/lib/phone"
import { cn } from "@/lib/utils"
import { isInstalled } from "./pwa/useInstallPrompt"

/**
 * The account menu at the top right on computers (ADR 0030): the person's initials open Profile,
 * Language, Help, Install and Log out. Keyboard: Enter or Space opens it, arrows move, Escape closes.
 * `base` is "" for officers and "/farmer" for farmers.
 */
export function AccountMenu({ base }: { base: "" | "/farmer" }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useSession()?.user
  const counts = countByStatus(useFarmers())
  const [loggingOut, setLoggingOut] = useState(false)
  if (!user) return null
  const officer = base === ""

  const items = [
    { icon: CircleUser, label: t("profile.title"), to: `${base}/profile` },
    {
      icon: Globe,
      label: t("profile.languageTitle"),
      to: `${base}/profile/language`,
    },
    { icon: CircleHelp, label: t("help.title"), to: `${base}/help` },
    ...(isInstalled()
      ? []
      : [{ icon: Download, label: t("install.title"), to: `${base}/install` }]),
  ]
  const itemStyle =
    "flex h-11 cursor-default items-center gap-3 rounded-xl px-3 text-base font-medium outline-none select-none data-[highlighted]:bg-muted"

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          aria-label={t("nav.account", { name: user.fullName })}
          className="flex h-11 items-center gap-1.5 rounded-full py-1 pr-2.5 pl-1 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 data-[popup-open]:bg-muted"
        >
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground"
          >
            {initials(user.fullName)}
          </span>
          <ChevronDown aria-hidden className="size-4 text-muted-foreground" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner
            side="bottom"
            align="end"
            sideOffset={8}
            className="z-40"
          >
            <Menu.Popup className="w-64 rounded-2xl bg-card p-2 shadow-floating ring-1 ring-border outline-none">
              <div className="px-3 pt-2 pb-3">
                <p className="truncate text-base font-medium text-foreground">
                  {user.fullName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {officer ? t("profile.officerRole") : t("profile.farmerRole")}
                </p>
              </div>
              {items.map(({ icon: Icon, label, to }) => (
                <Menu.Item
                  key={to}
                  onClick={() => void navigate(to)}
                  className={cn(itemStyle, "text-foreground")}
                >
                  <Icon aria-hidden className="size-5 text-primary" />
                  {label}
                </Menu.Item>
              ))}
              <Menu.Separator className="my-1 h-px bg-border" />
              <Menu.Item
                onClick={() => setLoggingOut(true)}
                className={cn(itemStyle, "text-destructive")}
              >
                <LogOut aria-hidden className="size-5" />
                {t("common.logOut")}
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <LogoutSheet
        open={loggingOut}
        onClose={() => setLoggingOut(false)}
        waiting={officer ? counts.waiting : 0}
      />
    </>
  )
}
