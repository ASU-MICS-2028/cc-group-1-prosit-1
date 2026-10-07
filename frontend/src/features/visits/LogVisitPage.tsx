import { Camera, LoaderCircle } from "lucide-react"
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useSession } from "@/auth/session"
import { BackHeader } from "@/components/Blocks"
import { ChoiceChips } from "@/components/form/ChoiceChips"
import { FieldError } from "@/components/form/FieldError"
import { TextField } from "@/components/form/TextField"
import { Button } from "@/components/ui/button"
import { useFarmer } from "@/features/farmers/farmers"
import { keepPhoto } from "@/features/registration/capture"
import { Question } from "@/features/registration/Question"
import { formatTime } from "@/lib/dates"
import {
  FARM_OBSERVATIONS,
  NEXT_VISITS,
  VISIT_TOPICS,
  type FarmObservation,
  type NextVisit,
  type VisitTopic,
} from "./options"
import { saveVisit } from "./store"

/** Log a visit (Figma 27): what was discussed and seen, photos, and when to come back. */
export function Component() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const session = useSession()
  const farmer = useFarmer(id)
  const [topics, setTopics] = useState<VisitTopic[]>([])
  const [observations, setObservations] = useState<FarmObservation[]>([])
  const [nextVisit, setNextVisit] = useState<NextVisit | null>(null)
  const [notes, setNotes] = useState("")
  const [photoIds, setPhotoIds] = useState<string[]>([])
  const [photoBusy, setPhotoBusy] = useState(false)
  const [missing, setMissing] = useState(false)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [startedAt] = useState(() => new Date().toISOString())

  if (farmer === undefined) return null
  if (farmer === null || !session) {
    return <BackHeader title={t("farmers.notFound")} to="/farmers" />
  }
  const farmerId = farmer.id
  const officerId = session.user.id

  async function addPhoto(file: File | undefined) {
    if (!file) return
    setPhotoBusy(true)
    try {
      const photo = await keepPhoto(file, null)
      setPhotoIds((ids) => [...ids, photo.id])
    } finally {
      setPhotoBusy(false)
    }
  }

  async function save() {
    if (topics.length === 0 && observations.length === 0) {
      setMissing(true)
      return
    }
    setSaving(true)
    setFailed(false)
    try {
      await saveVisit(
        farmerId,
        { topics, observations, notes, photoIds, nextVisit },
        officerId
      )
      await navigate("/visits", { replace: true })
    } catch {
      setFailed(true)
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <BackHeader
        title={t("visits.visitWith", { name: farmer.fullName })}
        subtitle={[
          farmer.community,
          t("visits.todayAt", { time: formatTime(startedAt) }),
        ]
          .filter(Boolean)
          .join(" · ")}
        to={`/farmers/${farmer.id}`}
      />

      <Question
        id="topics"
        label={t("visits.talkedAbout")}
        audioKey="visits.talkedAbout"
      >
        <ChoiceChips
          multiple
          labelledBy="topics-label"
          options={VISIT_TOPICS.map((v) => ({
            value: v,
            label: t(`visits.topics.${v}`),
          }))}
          value={topics}
          onChange={(v) => {
            setTopics(v)
            setMissing(false)
          }}
        />
      </Question>

      <Question
        id="observations"
        label={t("visits.saw")}
        audioKey="visits.saw"
        error={missing ? "register.errors.visitEmpty" : undefined}
      >
        <ChoiceChips
          multiple
          labelledBy="observations-label"
          options={FARM_OBSERVATIONS.map((v) => ({
            value: v,
            label: t(`visits.observations.${v}`),
          }))}
          value={observations}
          onChange={(v) => {
            setObservations(v)
            setMissing(false)
          }}
        />
      </Question>

      <label className="flex h-16 cursor-pointer items-center gap-3 rounded-[30px] bg-secondary px-3 text-base font-medium text-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
        <span
          aria-hidden
          className="flex size-11 items-center justify-center rounded-full bg-card"
        >
          {photoBusy ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : (
            <Camera className="size-5" />
          )}
        </span>
        {photoIds.length > 0
          ? t("visits.photoAdded", { count: photoIds.length })
          : t("visits.addPhoto")}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={photoBusy}
          onChange={(event) => {
            void addPhoto(event.target.files?.[0])
            event.target.value = ""
          }}
          className="sr-only"
        />
      </label>

      <Question
        id="notes"
        label={t("visits.notes")}
        audioKey="visits.notes"
        htmlFor="notes"
      >
        <TextField
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("visits.notesHint")}
        />
      </Question>

      <Question id="nextVisit" label={t("visits.next")} audioKey="visits.next">
        <ChoiceChips
          labelledBy="nextVisit-label"
          options={NEXT_VISITS.map((v) => ({
            value: v,
            label: t(`visits.nextVisits.${v}`),
          }))}
          value={nextVisit}
          onChange={setNextVisit}
        />
      </Question>

      <FieldError
        id="visit-error"
        message={failed ? t("register.review.saveFailed") : undefined}
      />
      <Button size="xl" onClick={() => void save()} disabled={saving}>
        {saving ? t("register.review.saving") : t("visits.save")}
      </Button>
    </div>
  )
}
