import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { BackHeader } from "@/components/Blocks"
import { LanguageBanner } from "@/components/LanguageBanner"
import { Button } from "@/components/ui/button"
import { getCountry, setCountry, type CountryCode } from "@/lib/country"
import { CountryOptions } from "./CountryOptions"

/** Shared · Change Country: pick a country, Save to keep it. */
export function Component() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const back = useLocation().pathname.replace(/\/change$/, "")
  const [chosen, setChosen] = useState<CountryCode>(getCountry)

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <BackHeader title={t("country.country")} to={back} tone="green" />
      <LanguageBanner lines={["Welcome!", "Where", "do you farm?"]} />
      <div>
        <h2 className="text-base font-medium text-foreground">
          {t("country.question")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("country.hint")}</p>
      </div>
      <CountryOptions value={chosen} onChange={setChosen} />
      <Button
        size="xl"
        className="w-full"
        onClick={() => {
          setCountry(chosen)
          void navigate(back)
        }}
      >
        {t("country.save")}
      </Button>
    </div>
  )
}
