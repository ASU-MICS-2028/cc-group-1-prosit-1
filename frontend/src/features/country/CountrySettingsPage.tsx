import { Banknote, Database, Globe, Ruler } from "lucide-react"
import { useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { BackHeader, ListRow } from "@/components/Blocks"
import { ChoiceChips } from "@/components/form/ChoiceChips"
import { LANGUAGES } from "@/i18n"
import { setAreaUnit, useAreaUnit, useCountry } from "@/lib/country"
import { Flag } from "./Flag"

/**
 * P2 · 09 Country and money (Profile): country, money, the unit farm sizes start in, language and
 * where the data is kept. The unit is used when registering a farmer.
 */
export function Component() {
  const { t, i18n } = useTranslation()
  const base = useLocation().pathname.replace(/\/country$/, "")
  const country = useCountry()
  const unit = useAreaUnit()
  const language =
    LANGUAGES.find((l) => l.code === i18n.language)?.label ?? "English"

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <BackHeader title={t("country.settingsTitle")} to={base} />
      <div className="relative">
        <ListRow
          icon={Globe}
          title={t("country.country")}
          subtitle={country.name}
          to={`${base}/country/change`}
        />
        <Flag
          country={country.code}
          className="pointer-events-none absolute top-1/2 right-12 -translate-y-1/2"
        />
      </div>
      <ListRow
        icon={Banknote}
        title={t("country.money")}
        subtitle={`${country.currency} (${country.symbol})`}
      />
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <p
          id="unit-label"
          className="flex items-center gap-3 text-base font-medium text-foreground"
        >
          <span
            aria-hidden
            className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary"
          >
            <Ruler className="size-5" />
          </span>
          {t("country.unit")}
        </p>
        <ChoiceChips
          labelledBy="unit-label"
          options={[
            { value: "acres", label: t("register.units.acres") },
            { value: "hectares", label: t("register.units.hectares") },
          ]}
          value={unit}
          onChange={(u) => setAreaUnit(u)}
        />
        <p className="text-sm text-muted-foreground">{t("country.unitHint")}</p>
      </div>
      <ListRow
        icon={Globe}
        title={t("profile.languageTitle")}
        subtitle={language}
        to={`${base}/language`}
      />
      <ListRow
        icon={Database}
        title={t("country.data")}
        subtitle={t("country.dataWhere", { store: country.dataStore })}
      />
      <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-warning">
        {t("country.note", { country: country.name })}
      </p>
    </div>
  )
}
