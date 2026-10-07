import { Check, Lock } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ButtonLink, Confirmation, FlowPage, InfoCard } from "@/components/Flow"
import { IllustrationCard } from "@/components/IllustrationCard"
import { providers, wallet } from "@/features/sample/data"
import { cn } from "@/lib/utils"

/** P3 · 02 Link mobile money, step 1: which provider. */
export function LinkWallet() {
  const { t } = useTranslation()
  const [chosen, setChosen] = useState<string>(providers[0])

  return (
    <FlowPage
      title={t("money.link.title")}
      step={t("money.link.step1")}
      back="/farmer/money"
      sample
      footer={
        <ButtonLink
          to="/farmer/money/link/approve"
          state={{ provider: chosen }}
        >
          {t("money.link.linkNumber", { number: wallet.number })}
        </ButtonLink>
      }
    >
      <IllustrationCard name="link-wallet.webp" className="h-40 py-2" />
      <h2 className="text-2xl leading-9 font-medium text-foreground">
        {t("money.link.which")}
      </h2>
      <div
        role="radiogroup"
        aria-label={t("money.link.which")}
        className="space-y-3"
      >
        {providers.map((p) => {
          const on = p === chosen
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setChosen(p)}
              className={cn(
                "flex w-full items-center justify-between rounded-full px-5 py-3.5 text-left text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                on
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              )}
            >
              {p}
              <span
                aria-hidden
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border-2",
                  on
                    ? "border-white bg-white text-primary"
                    : "border-muted-foreground/40"
                )}
              >
                {on ? <Check className="size-4" /> : null}
              </span>
            </button>
          )
        })}
      </div>
      <p className="flex gap-2 rounded-[20px] bg-secondary p-4 text-sm text-primary">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
        {t("money.link.pinNote")}
      </p>
    </FlowPage>
  )
}

/** P3 · 02b Approve on your phone: the provider's prompt asks for the PIN, never the app. */
export function ApproveOnPhone() {
  const { t } = useTranslation()
  return (
    <FlowPage
      title={t("money.link.title")}
      step={t("money.link.step2")}
      sample
      footer={
        <ButtonLink to="/farmer/money/link/done">
          {t("money.link.approved")}
        </ButtonLink>
      }
    >
      <InfoCard
        tone="selected"
        title={`${wallet.provider} · ${wallet.number}`}
        text={t("money.link.prompt")}
        picture={{ photo: "options/phone", emoji: "mobile-phone" }}
      />
      <p className="text-sm text-muted-foreground">{t("money.link.lookNow")}</p>
      <InfoCard
        tone="cream"
        title={t("money.link.noPrompt")}
        text={t("money.link.noPromptHow")}
        picture={{ photo: "options/nokia", emoji: "input-numbers" }}
      />
    </FlowPage>
  )
}

/** P3 · 02c Mobile money linked. */
export function WalletLinked() {
  const { t } = useTranslation()
  return (
    <Confirmation
      illustration="link-wallet.webp"
      sample
      badge={t("money.link.linkedBadge")}
      title={t("money.link.linkedTitle", { provider: wallet.provider })}
      text={t("money.link.linkedText")}
      rows={[
        [t("money.link.provider"), wallet.provider],
        [t("money.link.number"), wallet.number],
        [t("money.link.nameOnWallet"), wallet.name],
        [t("money.link.pin"), t("money.link.neverStored")],
      ]}
      primary={{ to: "/farmer/money", label: t("money.backToMoney") }}
    />
  )
}
