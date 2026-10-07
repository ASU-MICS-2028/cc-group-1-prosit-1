import { Controller, useFormContext, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { ChoiceChips } from "@/components/form/ChoiceChips"
import { TextField } from "@/components/form/TextField"
import { PhoneField } from "@/components/PhoneField"
import { QuestionTitle } from "@/components/QuestionTitle"
import { AGE_BANDS, GENDERS } from "../options"
import { Question, type StepProps } from "../Question"
import type { Registration } from "../schema"

/** Step 2 (Figma 05 / D08): name, phone, gender, age and where the farmer lives. */
export function PersonalStep({ showTitle = true }: StepProps = {}) {
  const { t } = useTranslation()
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<Registration>()
  const hasNoPhone = useWatch({ control, name: "hasNoPhone" })

  return (
    <>
      {showTitle ? (
        <QuestionTitle
          title={t("register.steps.personal")}
          audioKey="register.steps.personal"
        />
      ) : null}

      <Question
        id="fullName"
        label={t("register.personal.fullName")}
        audioKey="register.personal.fullName"
        htmlFor="fullName"
        error={errors.fullName?.message}
      >
        <TextField
          id="fullName"
          autoComplete="off"
          placeholder={t("register.personal.fullNamePlaceholder")}
          invalid={!!errors.fullName}
          aria-describedby={errors.fullName ? "fullName-error" : undefined}
          {...register("fullName")}
        />
      </Question>

      <Question
        id="phone"
        label={t("register.personal.phone")}
        audioKey="register.personal.phone"
        error={hasNoPhone ? undefined : errors.phone?.message}
        after={
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-foreground">
            <input
              type="checkbox"
              className="size-5 accent-primary"
              {...register("hasNoPhone")}
            />
            {t("register.personal.noPhone")}
          </label>
        }
      >
        {hasNoPhone ? null : (
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <PhoneField
                id="phone"
                value={field.value}
                onChange={field.onChange}
                invalid={!!errors.phone}
                describedBy={errors.phone ? "phone-error" : undefined}
              />
            )}
          />
        )}
      </Question>

      <div className="grid gap-6 md:grid-cols-2">
        <Question
          id="gender"
          label={t("register.personal.gender")}
          audioKey="register.personal.gender"
        >
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <ChoiceChips
                labelledBy="gender-label"
                options={GENDERS.map((g) => ({
                  value: g,
                  label: t(`register.genders.${g}`),
                }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Question>

        <Question
          id="ageBand"
          label={t("register.personal.age")}
          audioKey="register.personal.age"
        >
          <Controller
            name="ageBand"
            control={control}
            render={({ field }) => (
              <ChoiceChips
                labelledBy="ageBand-label"
                options={AGE_BANDS.map((a) => ({
                  value: a,
                  label: t(`register.ages.${a}`),
                }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Question>

        <Question
          id="community"
          label={t("register.personal.community")}
          audioKey="register.personal.community"
          htmlFor="community"
        >
          <TextField
            id="community"
            placeholder={t("register.personal.communityPlaceholder")}
            {...register("community")}
          />
        </Question>

        <Question
          id="regionDistrict"
          label={t("register.personal.region")}
          audioKey="register.personal.region"
          htmlFor="regionDistrict"
        >
          <TextField
            id="regionDistrict"
            placeholder={t("register.personal.regionPlaceholder")}
            {...register("regionDistrict")}
          />
        </Question>
      </div>
    </>
  )
}
