import { Controller, useFormContext, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { ChoiceChips } from "@/components/form/ChoiceChips"
import { PictureTiles } from "@/components/form/PictureTiles"
import { SizeStepper } from "@/components/form/SizeStepper"
import { QuestionTitle } from "@/components/QuestionTitle"
import { AREA_UNITS, CROPS, SEASONS, SOILS } from "../options"
import { Question, type StepProps } from "../Question"
import type { Registration } from "../schema"

/** Step 3 (Figma 06 / D09): crops, farm size, soil and planting seasons. */
export function FarmStep({ showTitle = true }: StepProps = {}) {
  const { t } = useTranslation()
  const {
    control,
    formState: { errors },
  } = useFormContext<Registration>()
  const unit = useWatch({ control, name: "farmSizeUnit" })

  return (
    <>
      {showTitle ? (
        <QuestionTitle
          title={t("register.steps.farm")}
          audioKey="register.steps.farm"
        />
      ) : null}

      <Question
        id="crops"
        label={t("register.farm.crops")}
        audioKey="register.farm.crops"
        error={errors.crops?.message}
      >
        <Controller
          name="crops"
          control={control}
          render={({ field }) => (
            <PictureTiles
              multiple
              labelledBy="crops-label"
              tiles={CROPS.map((c) => ({
                value: c.code,
                label: t(`register.crops.${c.code}`),
                icon: c.icon,
              }))}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Question>

      <div className="grid gap-6 md:grid-cols-2">
        <Question
          id="farmSize"
          label={t("register.farm.size")}
          audioKey="register.farm.size"
          htmlFor="farmSize"
          error={errors.farmSize?.message}
        >
          <Controller
            name="farmSize"
            control={control}
            render={({ field }) => (
              <SizeStepper
                id="farmSize"
                value={field.value}
                unit={t(`register.units.${unit}`)}
                onChange={field.onChange}
                invalid={!!errors.farmSize}
                describedBy={errors.farmSize ? "farmSize-error" : undefined}
              />
            )}
          />
          <Controller
            name="farmSizeUnit"
            control={control}
            render={({ field }) => (
              <ChoiceChips
                labelledBy="farmSize-label"
                options={AREA_UNITS.map((u) => ({
                  value: u,
                  label: t(`register.units.${u}`),
                }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Question>

        <Question
          id="soil"
          label={t("register.farm.soil")}
          audioKey="register.farm.soil"
        >
          <Controller
            name="soil"
            control={control}
            render={({ field }) => (
              <ChoiceChips
                labelledBy="soil-label"
                options={SOILS.map((s) => ({
                  value: s,
                  label: t(`register.soils.${s}`),
                }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Question>
      </div>

      <Question
        id="plantingSeasons"
        label={t("register.farm.seasons")}
        audioKey="register.farm.seasons"
      >
        <Controller
          name="plantingSeasons"
          control={control}
          render={({ field }) => (
            <PictureTiles
              multiple
              labelledBy="plantingSeasons-label"
              tiles={SEASONS.map((s) => ({
                value: s.code,
                label: t(`register.seasons.${s.code}`),
                icon: s.icon,
              }))}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Question>
    </>
  )
}
