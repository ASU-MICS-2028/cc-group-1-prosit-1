import { useTranslation } from "react-i18next"
import { getAdminOverview } from "@/api/admin"
import { NoDataYet } from "@/features/farmer/DataStatus"
import { useServerData } from "@/features/farmer/useServerData"
import { formatShortDate, formatTime, isToday } from "@/lib/dates"
import { maskPhone } from "@/lib/phone"
import { cn } from "@/lib/utils"

/** "today 09:02" or "6 Oct 09:02" */
function when(iso: string, today: string) {
  return `${isToday(iso) ? today : formatShortDate(iso)} ${formatTime(iso)}`
}

/**
 * The MoFA admin's Overview (ADR 0024): totals for their region or district, then every extension
 * officer with their farmers, this month's work and when they last synced. Live from the server.
 */
export function Component() {
  const { t } = useTranslation()
  const state = useServerData("admin-overview", getAdminOverview)
  const overview = state.data
  const area = overview?.area

  const subtitle = !area
    ? null
    : area.district
      ? t("admin.subtitleDistrict", {
          district: area.district,
          region: area.region,
        })
      : area.region
        ? t("admin.subtitleRegion", { region: area.region })
        : t("admin.subtitleNational")

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl leading-9 font-semibold text-primary">
          {t("admin.title")}
        </h1>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </header>

      {!overview ? (
        <NoDataYet state={state} />
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {(
              [
                [overview.officers, t("admin.officers"), "bg-secondary"],
                [overview.farmers, t("admin.farmers"), "bg-secondary"],
                [
                  overview.farmersThisMonth,
                  t("admin.newThisMonth"),
                  "bg-cream",
                ],
                [
                  overview.visitsThisMonth,
                  t("admin.visitsThisMonth"),
                  "bg-cream",
                ],
              ] as const
            ).map(([value, label, tone]) => (
              <li
                key={label}
                className={cn("space-y-1 rounded-[20px] p-4", tone)}
              >
                <p className="text-2xl font-semibold text-foreground tabular-nums">
                  {value.toLocaleString("en-GH")}
                </p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </li>
            ))}
          </ul>

          <section
            aria-labelledby="admin-officers"
            className="overflow-hidden rounded-[20px] border bg-card"
          >
            <h2
              id="admin-officers"
              className="px-5 pt-4 pb-3 text-base font-medium text-foreground"
            >
              {t("admin.officerList")}
            </h2>
            {overview.officerList.length === 0 ? (
              <p className="px-5 pb-5 text-muted-foreground">
                {t("admin.none")}
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-y bg-muted/50 text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-medium">
                      {t("admin.colOfficer")}
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      {t("admin.colDistrict")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2.5 text-right font-medium"
                    >
                      {t("admin.colFarmers")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2.5 text-right font-medium"
                    >
                      {t("admin.colThisMonth")}
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2.5 text-right font-medium"
                    >
                      {t("admin.colVisits")}
                    </th>
                    <th scope="col" className="px-5 py-2.5 font-medium">
                      {t("admin.colLastSync")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {overview.officerList.map((o) => (
                    <tr key={o.id}>
                      <th scope="row" className="px-5 py-3 font-normal">
                        <span className="block font-medium text-foreground">
                          {o.fullName}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {maskPhone(o.phoneE164)}
                        </span>
                      </th>
                      <td className="px-3 py-3 text-foreground">
                        {o.district ?? "–"}
                      </td>
                      <td className="px-3 py-3 text-right text-foreground tabular-nums">
                        {o.farmers}
                      </td>
                      <td className="px-3 py-3 text-right text-foreground tabular-nums">
                        {o.farmersThisMonth}
                      </td>
                      <td className="px-3 py-3 text-right text-foreground tabular-nums">
                        {o.visitsThisMonth}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {o.lastSyncAt
                          ? when(o.lastSyncAt, t("sync.today"))
                          : t("admin.never")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  )
}
