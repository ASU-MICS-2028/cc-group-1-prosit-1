import { Controller, useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { ChoiceChips } from "@/components/form/ChoiceChips"
import { PictureTiles } from "@/components/form/PictureTiles"
import { QuestionTitle } from "@/components/QuestionTitle"
import { HELP_NEEDS, LAST_VISITS } from "../options"
import { Question, type StepProps } from "../Question"
import type { Registration } from "../schema"

/** Step 7 (Figma 10 / D13): the last officer visit and the help the farmer needs most. */
export function HelpStep({ showTitle = true }: StepProps = {}) {
  const { t } = useTranslation()
  const { control } = useFormContext<Registration>()

  return (
    <>
      {showTitle ? (
        <QuestionTitle
          title={t("register.steps.help")}
          audioKey="register.steps.help"
        />
      ) : null}

      <Question
        id="lastAgentVisit"
        label={t("register.help.lastVisit")}
        audioKey="register.help.lastVisit"
      >
        <Controller
          name="lastAgentVisit"
          control={control}
          render={({ field }) => (
            <ChoiceChips
              labelledBy="lastAgentVisit-label"
              options={LAST_VISITS.map((v) => ({
                value: v,
                label: t(`register.lastVisits.${v}`),
              }))}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Question>

      <Question
        id="helpNeeded"
        label={t("register.help.needs")}
        audioKey="register.help.needs"
      >
        <Controller
          name="helpNeeded"
          control={control}
          render={({ field }) => (
            <PictureTiles
              multiple
              labelledBy="helpNeeded-label"
              tiles={HELP_NEEDS.map((h) => ({
                value: h.code,
                label: t(`register.helpNeeds.${h.code}`),
                picture: h.picture,
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
