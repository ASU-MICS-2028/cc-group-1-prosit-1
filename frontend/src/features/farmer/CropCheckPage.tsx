import { AlertTriangle, Camera, CheckCircle2, Phone, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
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

/**
 * The leaf photo, kept on this phone only: the check itself runs on the crop and the signs (the server
 * takes no photo yet). The photo makes the answer easy to compare with the plant, and the farmer can show
 * it to the officer.
 */
function useLeafPhoto() {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  return {
    url,
    set: (file: File | undefined) =>
      setUrl(file ? URL.createObjectURL(file) : null),
    clear: () => setUrl(null),
  }
}

/** Figma P2 · 05-07: an optional leaf photo, the crop and what they see; the answer is a likely problem and a checklist. */
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
  const photo = useLeafPhoto()
  const fileInput = useRef<HTMLInputElement>(null)

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
          {photo.url ? (
            <img
              src={photo.url}
              alt={t("farmerApp.cropCheck.yourPhoto")}
              className="h-52 w-full rounded-[30px] object-cover md:h-64"
            />
          ) : null}
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
              {result.advice.map((advice) => (
                <li key={advice} className="flex gap-3">
                  <CheckCircle2
                    aria-hidden
                    className="mt-0.5 size-6 shrink-0 text-primary"
                  />
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
                {t("farmerApp.cropCheck.askOfficer")}
              </a>
            ) : null}
            <Button
              size="xl"
              variant="secondary"
              className="text-primary md:w-60"
              onClick={() => {
                setResult(null)
                setSymptoms([])
                photo.clear()
              }}
            >
              {t("farmerApp.cropCheck.again")}
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section
            aria-labelledby="photo-label"
            className="space-y-3 rounded-[20px] border bg-card p-4"
          >
            <div>
              <h2
                id="photo-label"
                className="text-lg font-medium text-foreground"
              >
                {t("farmerApp.cropCheck.photo")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("farmerApp.cropCheck.photoHint")}
              </p>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-label={t("farmerApp.cropCheck.takePhoto")}
              onChange={(e) => photo.set(e.target.files?.[0])}
            />
            {photo.url ? (
              <div className="relative">
                <img
                  src={photo.url}
                  alt={t("farmerApp.cropCheck.yourPhoto")}
                  className="h-44 w-full rounded-2xl object-cover"
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2 size-10 rounded-full"
                  aria-label={t("farmerApp.cropCheck.removePhoto")}
                  onClick={photo.clear}
                >
                  <X aria-hidden />
                </Button>
              </div>
            ) : (
              <Button
                size="xl"
                variant="secondary"
                className="w-full text-primary md:w-80"
                onClick={() => fileInput.current?.click()}
              >
                <Camera aria-hidden />
                {t("farmerApp.cropCheck.takePhoto")}
              </Button>
            )}
          </section>
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
