import { zodResolver } from "@hookform/resolvers/zod"
import { useState, type ComponentType } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import { BackHeader } from "@/components/Blocks"
import { FieldError } from "@/components/form/FieldError"
import { Button } from "@/components/ui/button"
import type { LocalFarmer } from "@/db/local"
import type { StepProps } from "@/features/registration/Question"
import {
  registrationSchema,
  type Registration,
} from "@/features/registration/schema"
import { ContactStep } from "@/features/registration/steps/ContactStep"
import { FarmStep } from "@/features/registration/steps/FarmStep"
import { HelpStep } from "@/features/registration/steps/HelpStep"
import { LocationStep } from "@/features/registration/steps/LocationStep"
import { MoneyStep } from "@/features/registration/steps/MoneyStep"
import { PersonalStep } from "@/features/registration/steps/PersonalStep"
import { toAnswers, updateFarmer } from "./edit"
import { useFarmer } from "./farmers"

/** Which questions each Edit opens (the farmer page has one Edit per card). */
const SECTIONS: Record<
  string,
  {
    title: "personal" | "farm" | "location" | "contact" | "help"
    screens: ComponentType<StepProps>[]
  }
> = {
  personal: { title: "personal", screens: [PersonalStep] },
  farm: { title: "farm", screens: [FarmStep] },
  location: { title: "location", screens: [LocationStep] },
  contact: { title: "contact", screens: [ContactStep, MoneyStep] },
  help: { title: "help", screens: [HelpStep] },
}

/** Edit a farmer (Figma 20): the same questions as registering, one section at a time. */
export function Component() {
  const { t } = useTranslation()
  const { id, section = "personal" } = useParams()
  const farmer = useFarmer(id)
  if (farmer === undefined) return null
  if (farmer === null || !SECTIONS[section]) {
    return <BackHeader title={t("farmers.notFound")} to="/farmers" />
  }
  return <EditForm key={farmer.id} farmer={farmer} section={section} />
}

function EditForm({
  farmer,
  section,
}: {
  farmer: LocalFarmer
  section: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { title, screens } = SECTIONS[section]
  const form = useForm<Registration>({
    defaultValues: toAnswers(farmer),
    resolver: zodResolver(registrationSchema),
    mode: "onTouched",
  })
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const back = `/farmers/${farmer.id}`

  async function save() {
    if (!(await form.trigger(undefined, { shouldFocus: true }))) return
    setSaving(true)
    setFailed(false)
    try {
      await updateFarmer(farmer.id, form.getValues())
      await navigate(back, { replace: true })
    } catch {
      setFailed(true)
      setSaving(false)
    }
  }

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
        className="mx-auto flex max-w-3xl flex-col gap-6"
      >
        <BackHeader
          title={t("farmers.editTitle", {
            section: t(`register.steps.${title}`),
          })}
          subtitle={farmer.fullName}
          to={back}
        />
        {screens.map((Screen, index) => (
          <Screen key={index} showTitle={false} />
        ))}
        <FieldError
          id="edit-error"
          message={failed ? t("register.review.saveFailed") : undefined}
        />
        <div className="flex gap-3">
          <Button
            type="button"
            size="xl"
            variant="secondary"
            onClick={() => void navigate(back)}
            className="w-30 text-primary md:w-40"
          >
            {t("farmers.cancel")}
          </Button>
          <Button type="submit" size="xl" disabled={saving} className="flex-1">
            {saving ? t("register.review.saving") : t("farmers.saveChanges")}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
