import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { LanguageBanner } from "@/components/LanguageBanner"
import { ScreenShell } from "@/components/ScreenShell"
import { Button } from "@/components/ui/button"
import { getCountry, setCountry, type CountryCode } from "@/lib/country"
import { CountryOptions } from "./CountryOptions"

/** P2 · 01 Choose your country (before the language): it sets the money, languages and data store. */
export function Component() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [chosen, setChosen] = useState<CountryCode>(getCountry)

  return (
    <ScreenShell
      className="pt-6"
      brand={{ tagline: t("welcome.brand"), illustration: "language-people" }}
      footer={
        <Button
          size="xl"
          className="w-full"
          onClick={() => {
            setCountry(chosen)
            void navigate("/language")
          }}
        >
          {t("country.continue")}
        </Button>
      }
    >
      <div className="contents md:hidden">
        <p className="text-2xl leading-9 font-semibold text-primary">
          {t("app.name")}
        </p>
        <LanguageBanner lines={["Welcome!", "Where", "do you farm?"]} />
      </div>
      <div>
        <h1 className="text-base font-medium text-foreground md:text-2xl md:leading-9 md:font-semibold">
          {t("country.question")}
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          {t("country.hint")}
        </p>
      </div>
      <CountryOptions value={chosen} onChange={setChosen} />
    </ScreenShell>
  )
}
