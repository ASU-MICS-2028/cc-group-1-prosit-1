import { Controller, useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { ChoiceChips } from "@/components/form/ChoiceChips"
import { PictureTiles } from "@/components/form/PictureTiles"
import { QuestionTitle } from "@/components/QuestionTitle"
import { CHANNELS, DATA_PURCHASES, PHONE_TYPES } from "../options"
import { Question, type StepProps } from "../Question"
import type { Registration } from "../schema"

/** Step 5 (Figma 08 / D11): what phone the farmer has and how best to reach them. */
export function ContactStep({ showTitle = true }: StepProps = {}) {
  const { t } = useTranslation()
  const { control } = useFormContext<Registration>()

  return (
    <>
      {showTitle ? (
        <QuestionTitle
          title={t("register.steps.contact")}
          audioKey="register.steps.contact"
        />
      ) : null}

      <Question
        id="phoneType"
        label={t("register.contact.phoneType")}
        audioKey="register.contact.phoneType"
      >
        <Controller
          name="phoneType"
          control={control}
          render={({ field }) => (
            <PictureTiles
              labelledBy="phoneType-label"
              tiles={PHONE_TYPES.map((p) => ({
                value: p.code,
                label: t(`register.phoneTypes.${p.code}`),
                picture: p.picture,
              }))}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Question>

      <Question
        id="dataPurchase"
        label={t("register.contact.dataPurchase")}
        audioKey="register.contact.dataPurchase"
      >
        <Controller
          name="dataPurchase"
          control={control}
          render={({ field }) => (
            <ChoiceChips
              labelledBy="dataPurchase-label"
              options={DATA_PURCHASES.map((d) => ({
                value: d,
                label: t(`register.dataPurchases.${d}`),
              }))}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Question>

      <Question
        id="reachChannels"
        label={t("register.contact.reach")}
        audioKey="register.contact.reach"
      >
        <Controller
          name="reachChannels"
          control={control}
          render={({ field }) => (
            <PictureTiles
              multiple
              labelledBy="reachChannels-label"
              tiles={CHANNELS.map((c) => ({
                value: c.code,
                label: t(`register.channels.${c.code}`),
                picture: c.picture,
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
