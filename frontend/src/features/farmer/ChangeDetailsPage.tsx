import { CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ApiError } from "@/api/client"
import { requestChange, type ChangeArea } from "@/api/farmer"
import { ChoiceChips } from "@/components/form/ChoiceChips"
import { FieldError } from "@/components/form/FieldError"
import { Button } from "@/components/ui/button"
import { Question } from "@/features/registration/Question"
import { FarmerPage } from "./FarmerPage"

const AREAS: ChangeArea[] = ["phone", "farm", "crops", "other"]

/**
 * Change my details: a farmer cannot edit their own record (the officer registered it and answers for it),
 * so they say what is wrong and it goes to their officer.
 */
export function Component() {
  const { t } = useTranslation()
  const [area, setArea] = useState<ChangeArea>("phone")
  const [details, setDetails] = useState("")
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)

  async function send() {
    if (!details.trim()) {
      setProblem(t("farmerApp.change.empty"))
      return
    }
    setBusy(true)
    setProblem(null)
    try {
      const answer = await requestChange({ area, details: details.trim() })
      setReference(answer.reference)
    } catch (error) {
      setProblem(
        error instanceof ApiError ? error.message : t("errors.generic")
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <FarmerPage title={t("farmerApp.change.title")}>
      {reference ? (
        <div
          role="status"
          className="space-y-4 rounded-[20px] bg-secondary p-5"
        >
          <p className="flex items-start gap-3 text-base font-medium text-primary">
            <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0" />
            {t("farmerApp.change.sent", { reference })}
          </p>
          <Button
            size="xl"
            variant="secondary"
            className="bg-card text-primary"
            onClick={() => {
              setReference(null)
              setDetails("")
            }}
          >
            {t("farmerApp.change.another")}
          </Button>
        </div>
      ) : (
        <>
          <p className="text-base text-muted-foreground">
            {t("farmerApp.change.intro")}
          </p>
          <Question
            id="area"
            label={t("farmerApp.change.what")}
            audioKey="farmerApp.change.what"
          >
            <ChoiceChips
              labelledBy="area-label"
              options={AREAS.map((a) => ({
                value: a,
                label: t(`farmerApp.change.areas.${a}`),
              }))}
              value={area}
              onChange={setArea}
            />
          </Question>
          <Question
            id="details"
            label={t("farmerApp.change.details")}
            audioKey="farmerApp.change.details"
            htmlFor="details"
          >
            <textarea
              id="details"
              rows={4}
              maxLength={500}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t("farmerApp.change.placeholder")}
              aria-invalid={problem ? true : undefined}
              aria-describedby={problem ? "change-error" : undefined}
              className="w-full rounded-[24px] border-2 border-primary bg-card px-5 py-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </Question>
          <FieldError id="change-error" message={problem ?? undefined} />
          <Button
            size="xl"
            onClick={() => void send()}
            disabled={busy}
            className="md:w-80"
          >
            {busy ? t("farmerApp.change.sending") : t("farmerApp.change.send")}
          </Button>
        </>
      )}
    </FarmerPage>
  )
}
