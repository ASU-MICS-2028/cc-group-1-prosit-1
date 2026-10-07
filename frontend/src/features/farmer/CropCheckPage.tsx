import { AlertTriangle, Phone } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ApiError } from "@/api/client"
import {
  checkCrop,
  getMyFarm,
  type CropCheck,
  type CropSymptom,
} from "@/api/farmer"
import { ChoiceChips } from "@/components/form/ChoiceChips"
import { FieldError } from "@/components/form/FieldError"
import { PictureTiles } from "@/components/form/PictureTiles"
import { Button, buttonVariants } from "@/components/ui/button"
import { CROPS, type Crop } from "@/features/registration/options"
import { Question } from "@/features/registration/Question"
import { cn } from "@/lib/utils"
import { DataStatus } from "./DataStatus"
import { FarmerPage } from "./FarmerPage"
import { useServerData } from "./useServerData"

const SYMPTOMS: CropSymptom[] = [
  "holes_in_leaves",
  "insects_seen",
  "yellow_leaves",
  "spots_on_leaves",
  "wilting",
  "stunted",
  "rotting",
]

/** Check my crop: the farmer picks the crop and what they see; the answer is a likely problem and what to do. */
export function Component() {
  const { t } = useTranslation()
  const farm = useServerData("me", getMyFarm)
  const officer = farm.data?.officer
  const mine = farm.data?.farmer.crops ?? []
  // The farmer's own crops first.
  const crops = [...CROPS].sort(
    (a, b) => Number(mine.includes(b.code)) - Number(mine.includes(a.code))
  )
  const [crop, setCrop] = useState<Crop | null>(null)
  const [symptoms, setSymptoms] = useState<CropSymptom[]>([])
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [result, setResult] = useState<CropCheck | null>(null)

  async function check() {
    if (!crop) return setProblem(t("farmerApp.cropCheck.chooseCrop"))
    if (symptoms.length === 0)
      return setProblem(t("farmerApp.cropCheck.chooseSymptom"))
    setBusy(true)
    setProblem(null)
    try {
      setResult(await checkCrop({ crop, symptoms }))
    } catch (error) {
      setProblem(
        error instanceof ApiError ? error.message : t("errors.generic")
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <FarmerPage title={t("farmerApp.cropCheck.title")}>
      {result ? (
        <section className="space-y-4" aria-live="polite">
          <DataStatus source={result.source} state={{ ...farm, error: null }} />
          <div className="space-y-2 rounded-[30px] bg-cream p-5">
            <p className="text-sm text-muted-foreground">
              {t("farmerApp.cropCheck.likely")}
            </p>
            <h2 className="text-2xl font-medium text-foreground">
              {t(`farmerApp.cropCheck.problems.${result.likelyProblem}`)}
            </h2>
            {result.urgent ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive-soft px-3 py-1 text-sm font-medium text-destructive">
                <AlertTriangle aria-hidden className="size-4" />
                {t("farmerApp.cropCheck.urgent")}
              </span>
            ) : null}
          </div>
          <div className="space-y-3 rounded-[20px] border bg-card p-5">
            <h3 className="text-base font-medium text-foreground">
              {t("farmerApp.cropCheck.whatToDo")}
            </h3>
            <ol className="space-y-3">
              {result.advice.map((advice, index) => (
                <li key={advice} className="flex gap-3">
                  <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground"
                  >
                    {index + 1}
                  </span>
                  <span className="text-base text-foreground">
                    {t(`farmerApp.cropCheck.advice.${advice}`)}
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-sm text-muted-foreground">
              {t("farmerApp.cropCheck.guide")}
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            {officer ? (
              <a
                href={`tel:${officer.phoneE164}`}
                className={cn(buttonVariants({ size: "xl" }), "md:w-72")}
              >
                <Phone aria-hidden />
                {t("farmerApp.rows.call")}
              </a>
            ) : null}
            <Button
              size="xl"
              variant="secondary"
              className="text-primary md:w-60"
              onClick={() => {
                setResult(null)
                setSymptoms([])
              }}
            >
              {t("farmerApp.cropCheck.again")}
            </Button>
          </div>
        </section>
      ) : (
        <>
          <Question
            id="crop"
            label={t("farmerApp.cropCheck.which")}
            audioKey="farmerApp.cropCheck.which"
          >
            <PictureTiles
              look="photo"
              labelledBy="crop-label"
              tiles={crops.map((c) => ({
                value: c.code,
                label: t(`register.crops.${c.code}`),
                picture: c.picture,
              }))}
              value={crop}
              onChange={(c) => {
                setCrop(c)
                setProblem(null)
              }}
            />
          </Question>
          <Question
            id="symptoms"
            label={t("farmerApp.cropCheck.see")}
            audioKey="farmerApp.cropCheck.see"
          >
            <ChoiceChips
              multiple
              labelledBy="symptoms-label"
              options={SYMPTOMS.map((s) => ({
                value: s,
                label: t(`farmerApp.cropCheck.symptoms.${s}`),
              }))}
              value={symptoms}
              onChange={(s) => {
                setSymptoms(s)
                setProblem(null)
              }}
            />
          </Question>
          <FieldError id="check-error" message={problem ?? undefined} />
          <Button
            size="xl"
            onClick={() => void check()}
            disabled={busy}
            className="md:w-80"
          >
            {busy
              ? t("farmerApp.cropCheck.checking")
              : t("farmerApp.cropCheck.check")}
          </Button>
        </>
      )}
    </FarmerPage>
  )
}
