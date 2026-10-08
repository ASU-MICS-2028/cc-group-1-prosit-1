import {
  Database,
  Download,
  Globe,
  Info,
  Banknote,
  LogOut,
  RefreshCw,
  CircleHelp,
  ShieldAlert,
} from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { isInstalled } from "@/app/pwa/useInstallPrompt"
import { ListRow, SectionTitle } from "@/components/Blocks"
import { Avatar } from "@/features/farmers/FarmerRow"
import { countByStatus, useFarmers } from "@/features/farmers/farmers"
import { useLastSync } from "@/features/sync/sync"
import { LANGUAGES } from "@/i18n"
import { useCountry } from "@/lib/country"
import { formatTime, formatShortDate, isToday } from "@/lib/dates"
import { LogoutSheet } from "./LogoutSheet"
import { LostPhoneSheet } from "./LostPhoneSheet"

/** The app version people see in About. */
export const APP_VERSION = "1.0"

/** How much this site keeps on the device (app files, farmers, photos), in MB. */
function useStorageUsedMb(): number | null {
  const [mb, setMb] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    void navigator.storage
      ?.estimate?.()
      .then(({ usage }) => {
        if (alive && usage !== undefined)
          setMb(Math.max(1, Math.round(usage / 1_000_000)))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return mb
}

/**
 * Profile and settings (Figma 16 / D19 for officers, "Farmer · My Profile"): who is signed in, then
 * rows. Officers also see storage and sync; on computers the rows sit in two columns.
 */
export function ProfileView({
  name,
  subtitle,
  base,
  officer,
}: {
  name: string
  subtitle: string
  /** "/profile" or "/farmer": where Language and Help live */
  base: "" | "/farmer"
  officer: boolean
}) {
  const { t, i18n } = useTranslation()
  const counts = countByStatus(useFarmers())
  const lastSync = useLastSync()
  const usedMb = useStorageUsedMb()
  const [loggingOut, setLoggingOut] = useState(false)
  const [reportingPhone, setReportingPhone] = useState(false)
  const country = useCountry()
  const language =
    LANGUAGES.find((l) => l.code === i18n.language)?.label ?? "English"
  const lastSent = lastSync
    ? t("sync.lastSent", {
        when: `${isToday(lastSync) ? t("sync.today") : formatShortDate(lastSync)} ${formatTime(lastSync)}`,
      })
    : t("sync.neverSent")

  return (
    <div className="space-y-6">
      <h1 className="text-2xl leading-9 font-semibold text-primary">
        {t("profile.title")}
      </h1>
      <section className="flex items-center gap-4 rounded-[30px] bg-cream p-4 md:p-5">
        <Avatar name={name} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-xl leading-7.5 font-medium text-foreground">
            {name}
          </p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Group title={t("profile.app")}>
          <ListRow
            icon={Globe}
            title={t("profile.languageTitle")}
            subtitle={language}
            to={`${base}/profile/language`}
          />
          <ListRow
            icon={Banknote}
            title={t("country.settingsTitle")}
            subtitle={`${country.name} · ${country.symbol}`}
            to={`${base}/profile/country`}
          />
          {officer ? (
            <>
              <ListRow
                icon={Database}
                title={t("profile.stored")}
                subtitle={[
                  usedMb ? t("profile.mbUsed", { count: usedMb }) : null,
                  t("sync.notSentYet", { count: counts.waiting }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                to="/sync"
              />
              <ListRow
                icon={RefreshCw}
                title={t("sync.title")}
                subtitle={lastSent}
                to="/sync"
              />
            </>
          ) : null}
          {isInstalled() ? null : (
            <ListRow
              icon={Download}
              title={t("install.title")}
              subtitle={t("install.short")}
              to={`${base}/install`}
            />
          )}
        </Group>
        <Group title={t("profile.helpAccount")}>
          <ListRow
            icon={CircleHelp}
            title={t("help.row")}
            subtitle={t("help.short")}
            to={`${base}/help`}
          />
          <ListRow
            icon={Info}
            title={t("profile.about")}
            subtitle={t("profile.version", { version: APP_VERSION })}
          />
          {officer ? (
            <ListRow
              icon={ShieldAlert}
              title={t("lostPhone.row")}
              subtitle={t("lostPhone.rowHint")}
              onClick={() => setReportingPhone(true)}
            />
          ) : null}
          <ListRow
            icon={LogOut}
            title={t("common.logOut")}
            tone="red"
            onClick={() => setLoggingOut(true)}
          />
        </Group>
      </div>

      <LostPhoneSheet
        open={reportingPhone}
        onClose={() => setReportingPhone(false)}
      />
      <LogoutSheet
        open={loggingOut}
        onClose={() => setLoggingOut(false)}
        waiting={officer ? counts.waiting : 0}
      />
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <SectionTitle className="hidden md:flex">{title}</SectionTitle>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
