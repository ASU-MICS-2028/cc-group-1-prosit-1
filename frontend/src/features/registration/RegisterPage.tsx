import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useRef, useState } from "react"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useLoaderData, useNavigate, useSearchParams } from "react-router-dom"
import { getSession } from "@/auth/session"
import type { LocalFarmer } from "@/db/local"
import { DuplicateCheck } from "./DuplicateCheck"
import { ReviewStep } from "./ReviewStep"
import { registrationSchema, STEPS, type Registration } from "./schema"
import { ConsentStep } from "./steps/ConsentStep"
import { ContactStep } from "./steps/ContactStep"
import { FarmStep } from "./steps/FarmStep"
import { HelpStep } from "./steps/HelpStep"
import { LocationStep } from "./steps/LocationStep"
import { MoneyStep } from "./steps/MoneyStep"
import { PersonalStep } from "./steps/PersonalStep"
import {
  discardDraft,
  farmersWithPhone,
  loadDraft,
  saveDraft,
  saveFarmer,
} from "./store"
import { WizardShell } from "./WizardShell"

const TOTAL = STEPS.length
/** "Check and save" comes after the 7 steps. */
const REVIEW = TOTAL + 1
const STEP_SCREENS = [
  ConsentStep,
  PersonalStep,
  FarmStep,
  LocationStep,
  ContactStep,
  MoneyStep,
  HelpStep,
]

/** The half-filled form from last time, so a closed app or a flat battery loses nothing. */
export function loader() {
  return loadDraft()
}

/** The step in the address (?step=3, ?step=review), so the phone's back button goes back a step. */
function readStep(value: string | null, fallback: number): number {
  if (value === "review") return REVIEW
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= TOTAL ? n : fallback
}

/** Register a farmer: 7 short steps, then Check and save (Figma 04 to 12, D07 to D15). */
export function Component() {
  const { t, i18n } = useTranslation()
  const draft = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const form = useForm<Registration>({
    defaultValues: draft.data,
    resolver: zodResolver(registrationSchema),
    mode: "onTouched",
  })
  const values = useWatch({ control: form.control })
  const consented = useWatch({ control: form.control, name: "consentGiven" })
  const [duplicate, setDuplicate] = useState<LocalFarmer | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  // Set once the form is finished, so a late autosave cannot bring the draft back.
  const closed = useRef(false)
  // A step opened because one of its answers is wrong: show why once its fields are on screen.
  const recheck = useRef(false)

  // Nothing is kept before the farmer agrees: without consent the form starts at step 1.
  const step = consented ? readStep(params.get("step"), draft.step) : 1
  const fromReview = params.get("from") === "review"

  // "Draft saved": keep every answer on the phone, half a second after the last change.
  useEffect(() => {
    if (!consented) return
    const timer = setTimeout(() => {
      if (!closed.current)
        void saveDraft(form.getValues(), Math.min(step, TOTAL))
    }, 500)
    return () => clearTimeout(timer)
  }, [values, step, consented, form])

  useEffect(() => {
    if (!recheck.current || step > TOTAL) return
    recheck.current = false
    void form.trigger(STEPS[step - 1].fields, { shouldFocus: true })
  }, [step, form])

  function goTo(next: number, extra: Record<string, string> = {}) {
    setParams({ step: next === REVIEW ? "review" : String(next), ...extra })
    window.scrollTo({ top: 0 })
  }

  async function leave(to: string, discard: boolean) {
    closed.current = true
    if (discard) await discardDraft()
    await navigate(to)
  }

  async function next() {
    const fields = STEPS[step - 1].fields
    if (
      fields.length > 0 &&
      !(await form.trigger(fields, { shouldFocus: true }))
    )
      return
    goTo(fromReview || step === TOTAL ? REVIEW : step + 1)
  }

  function back() {
    if (step === 1) void leave("/", false)
    else if (fromReview) goTo(REVIEW)
    else goTo(step - 1)
  }

  async function save(confirmedShared = false) {
    if (!(await form.trigger(undefined, { shouldFocus: true }))) {
      // A rule broken on an earlier step (an old draft, say): open that step.
      const bad = STEPS.findIndex((s) =>
        s.fields.some((f) => form.getFieldState(f).invalid)
      )
      recheck.current = true
      goTo(bad >= 0 ? bad + 1 : 1, { from: "review" })
      return
    }
    const data = form.getValues()
    const session = getSession()
    if (!session) return void navigate("/who")
    setSaving(true)
    setSaveFailed(false)
    try {
      if (!confirmedShared && !data.hasNoPhone) {
        const [match] = await farmersWithPhone(data.phone)
        if (match) {
          setDuplicate(match)
          return
        }
      }
      closed.current = true
      const farmer = await saveFarmer(data, {
        officerId: session.user.id,
        language: i18n.language,
      })
      await navigate("/register/saved", {
        replace: true,
        state: {
          id: farmer.id,
          name: farmer.fullName,
          gender: farmer.gender,
        },
      })
    } catch {
      closed.current = false
      setSaveFailed(true)
    } finally {
      setSaving(false)
    }
  }

  if (duplicate) {
    return (
      <DuplicateCheck
        existing={duplicate}
        current={form.getValues()}
        busy={saving}
        onBack={() => setDuplicate(null)}
        onDifferent={() => {
          setDuplicate(null)
          void save(true)
        }}
        onSame={() => void leave(`/farmers/${duplicate.id}`, true)}
      />
    )
  }

  const Screen = STEP_SCREENS[step - 1]
  const title =
    step === REVIEW
      ? t("register.review.title")
      : t(`register.steps.${STEPS[step - 1].key}`)

  return (
    <FormProvider {...form}>
      <WizardShell
        step={step}
        title={title}
        subtitle={
          step === REVIEW
            ? t("register.review.allDone")
            : t("register.stepOf", { step, total: TOTAL })
        }
        draftSaved={consented}
        onBack={back}
        onSaveAndExit={() => void leave("/", false)}
        back={
          step === 1
            ? { label: t("register.no"), onClick: () => void leave("/", true) }
            : { label: t("register.back"), onClick: back }
        }
        next={
          step === 1
            ? {
                label: t("register.agree"),
                onClick: () => {
                  form.setValue("consentGiven", true)
                  goTo(2)
                },
              }
            : step === REVIEW
              ? {
                  label: saving
                    ? t("register.review.saving")
                    : t("register.review.save"),
                  onClick: () => void save(),
                  busy: saving,
                }
              : {
                  label: fromReview
                    ? t("register.backToReview")
                    : t("register.next"),
                  onClick: () => void next(),
                }
        }
      >
        {step === REVIEW ? (
          <ReviewStep
            saveFailed={saveFailed}
            onEdit={(n) => goTo(n, { from: "review" })}
          />
        ) : (
          <Screen />
        )}
      </WizardShell>
    </FormProvider>
  )
}
