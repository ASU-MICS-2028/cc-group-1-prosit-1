import { Controller, useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { ChoiceChips } from "@/components/form/ChoiceChips"
import { PictureTiles } from "@/components/form/PictureTiles"
import { QuestionTitle } from "@/components/QuestionTitle"
import { BANK_ANSWERS, INCOME_SOURCES, MOBILE_MONEY } from "../options"
import { Question, type StepProps } from "../Question"
import type { Registration } from "../schema"

/** Step 6 (Figma 09 / D12): income and banking. Every question can be skipped. */
export function MoneyStep({ showTitle = true }: StepProps = {}) {
  const { t } = useTranslation()
  const { control } = useFormContext<Registration>()

  return (
    <>
      {showTitle ? (
        <QuestionTitle
          title={t("register.steps.money")}
          audioKey="register.steps.money"
        />
      ) : null}
      <p className="text-base text-muted-foreground">
        {t("register.optional")}
      </p>

      <Question
        id="incomeSources"
        label={t("register.money.income")}
        audioKey="register.money.income"
      >
        <Controller
          name="incomeSources"
          control={control}
          render={({ field }) => (
            <PictureTiles
              multiple
              labelledBy="incomeSources-label"
              tiles={INCOME_SOURCES.map((s) => ({
                value: s.code,
                label: t(`register.incomeSources.${s.code}`),
                picture: s.picture,
              }))}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Question>

      <div className="grid gap-6 md:grid-cols-2">
        <Question
          id="hasBankAccount"
          label={t("register.money.bank")}
          audioKey="register.money.bank"
        >
          <Controller
            name="hasBankAccount"
            control={control}
            render={({ field }) => (
              <PictureTiles
                labelledBy="hasBankAccount-label"
                tiles={BANK_ANSWERS.map((b) => ({
                  value: b.code,
                  label: t(`register.bankAnswers.${b.code}`),
                  picture: b.picture,
                }))}
                value={field.value === null ? null : field.value ? "yes" : "no"}
                onChange={(answer) => field.onChange(answer === "yes")}
              />
            )}
          />
        </Question>

        <Question
          id="mobileMoney"
          label={t("register.money.mobileMoney")}
          audioKey="register.money.mobileMoney"
        >
          <Controller
            name="mobileMoney"
            control={control}
            render={({ field }) => (
              <ChoiceChips
                labelledBy="mobileMoney-label"
                options={MOBILE_MONEY.map((m) => ({
                  value: m,
                  label: t(`register.mobileMoneyAnswers.${m}`),
                }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Question>
      </div>
    </>
  )
}
