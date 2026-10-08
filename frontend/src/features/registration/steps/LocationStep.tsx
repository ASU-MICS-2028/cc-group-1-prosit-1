import { Camera, LoaderCircle, LocateFixed } from "lucide-react"
import { useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { FieldError } from "@/components/form/FieldError"
import { FieldLabel } from "@/components/form/FieldLabel"
import { QuestionTitle } from "@/components/QuestionTitle"
import { Button } from "@/components/ui/button"
import { usePhotoUrl } from "@/lib/usePhotoUrl"
import { findLocation, keepPhoto, type LocationProblem } from "../capture"
import type { StepProps } from "../Question"
import type { Registration } from "../schema"

/**
 * Step 4 (Figma 07 / D10): the farm's GPS point and a photo. Both are optional: a phone
 * without GPS or a camera must never stop a farmer from being registered.
 */
export function LocationStep({ showTitle = true }: StepProps = {}) {
  const { t } = useTranslation()
  const { setValue, control } = useFormContext<Registration>()
  const [latitude, longitude, accuracy, photoId] = useWatch({
    control,
    name: ["latitude", "longitude", "locationAccuracyMetres", "photoId"],
  })
  const [finding, setFinding] = useState(false)
  const [problem, setProblem] = useState<LocationProblem | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoFailed, setPhotoFailed] = useState(false)
  const found = latitude !== null && longitude !== null

  async function locate() {
    setFinding(true)
    setProblem(null)
    try {
      const fix = await findLocation()
      setValue("latitude", fix.latitude, { shouldDirty: true })
      setValue("longitude", fix.longitude, { shouldDirty: true })
      setValue("locationAccuracyMetres", fix.accuracyMetres, {
        shouldDirty: true,
      })
    } catch (reason) {
      setProblem(reason === "denied" ? "denied" : "failed")
    } finally {
      setFinding(false)
    }
  }

  async function takePhoto(file: File | undefined) {
    if (!file) return
    setPhotoBusy(true)
    setPhotoFailed(false)
    try {
      const photo = await keepPhoto(file, photoId)
      setValue("photoId", photo.id, { shouldDirty: true })
      setValue("photoSizeBytes", photo.sizeBytes, { shouldDirty: true })
    } catch {
      setPhotoFailed(true)
    } finally {
      setPhotoBusy(false)
    }
  }

  return (
    <>
      {showTitle ? (
        <QuestionTitle
          title={t("register.steps.location")}
          audioKey="register.steps.location"
        />
      ) : null}
      <p className="text-base text-muted-foreground">
        {t("register.optional")}
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-3xl border bg-card p-5">
          <FieldLabel id="location-label" audioKey="register.location.title">
            {t("register.location.title")}
          </FieldLabel>
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-13 shrink-0 items-center justify-center rounded-full bg-secondary"
            >
              <img src="/icons/map-pin.svg" alt="" className="size-7" />
            </span>
            <div aria-live="polite" className="min-w-0 flex-1">
              {found ? (
                <>
                  <p className="font-medium text-primary">
                    {t("register.location.found")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {latitude}, {longitude}
                    {accuracy !== null
                      ? ` · ${t("register.location.accuracy", { metres: accuracy })}`
                      : null}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {finding
                    ? t("register.location.finding")
                    : t("register.location.hint")}
                </p>
              )}
            </div>
          </div>
          <FieldError
            id="location-error"
            message={problem ? t(`register.location.${problem}`) : undefined}
          />
          <Button
            size="xl"
            variant={found ? "secondary" : "default"}
            onClick={() => void locate()}
            disabled={finding}
            className={found ? "text-primary" : undefined}
          >
            {finding ? (
              <LoaderCircle aria-hidden className="animate-spin" />
            ) : (
              <LocateFixed aria-hidden />
            )}
            {found || problem
              ? t("register.location.retry")
              : t("register.location.find")}
          </Button>
        </section>

        <section className="flex flex-col gap-4 rounded-3xl border bg-card p-5">
          <FieldLabel id="photo-label" audioKey="register.location.photo">
            {t("register.location.photo")}
          </FieldLabel>
          {photoId ? <PhotoPreview id={photoId} /> : null}
          <p className="text-sm text-muted-foreground">
            <span className="md:hidden">
              {t("register.location.photoNote")}
            </span>
            <span className="hidden md:inline">
              {t("register.location.photoNoteComputer")}
            </span>
          </p>
          <FieldError
            id="photo-error"
            message={
              photoFailed ? t("register.location.photoFailed") : undefined
            }
          />
          {/* A real file input styled as the button: opens the back camera on phones,
              the file picker on computers. */}
          <label
            className={
              "inline-flex h-12.5 cursor-pointer items-center justify-center gap-2 rounded-full px-6 text-base font-semibold outline-none has-focus-visible:ring-3 has-focus-visible:ring-ring/50 " +
              (photoId
                ? "bg-secondary text-primary"
                : "bg-primary text-primary-foreground")
            }
          >
            {photoBusy ? (
              <LoaderCircle aria-hidden className="size-5 animate-spin" />
            ) : (
              <Camera aria-hidden className="size-5" />
            )}
            {photoId
              ? t("register.location.retake")
              : t("register.location.takePhoto")}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={photoBusy}
              onChange={(event) => {
                void takePhoto(event.target.files?.[0])
                event.target.value = ""
              }}
              className="sr-only"
            />
          </label>
        </section>
      </div>
    </>
  )
}

/** The kept photo, read back from the phone's database. */
function PhotoPreview({ id }: { id: string }) {
  const { t } = useTranslation()
  const url = usePhotoUrl(id)
  if (!url) return null
  return (
    <img
      src={url}
      alt={t("register.location.photoAlt")}
      className="aspect-4/3 w-full rounded-2xl object-cover"
    />
  )
}
