import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { useId, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"
import { ChoiceChips } from "@/components/form/ChoiceChips"
import { FieldError } from "@/components/form/FieldError"
import { FieldLabel } from "@/components/form/FieldLabel"
import { TextField } from "@/components/form/TextField"
import {
  ButtonLink,
  Confirmation,
  FlowPage,
  InfoCard,
  TermsCard,
} from "@/components/Flow"
import { IllustrationCard } from "@/components/IllustrationCard"
import { Button } from "@/components/ui/button"
import { getSession } from "@/auth/session"
import { toE164 } from "@/lib/phone"
import { amount as checkAmount, ghanaPhone } from "@/lib/validate"
import { cedis, insurance, loanOffer, wallet } from "@/features/sample/data"

function loanTerms(amount: number, t: TFunction): [string, string][] {
  const fee = Math.round(amount * loanOffer.feeRate)
  return [
    [t("money.loan.loan"), cedis(amount)],
    [t("money.loan.fee"), `${cedis(fee)} (5%)`],
    [t("money.loan.payBack"), loanOffer.payBack],
  ]
}
const crops = ["maize", "groundnut", "rice", "other"] as const

const loanTotal = (amount: number) =>
  amount + Math.round(amount * loanOffer.feeRate)

/** P3 · 05 Seed loan offer: how much, why the farmer qualifies, and the terms. */
export function LoanOffer() {
  const { t } = useTranslation()
  const reasons = [
    t("money.loan.why1"),
    t("money.loan.why2"),
    t("money.loan.why3"),
  ]
  return (
    <FlowPage
      title={t("money.loan.title")}
      back="/farmer/money"
      sample
      footer={
        <>
          <ButtonLink
            to="/farmer/money/loan/sent"
            state={{ amount: loanOffer.max }}
          >
            {t("money.loan.apply", { amount: cedis(loanOffer.max) })}
          </ButtonLink>
          <ButtonLink to="/farmer/money/loan/amount" variant="secondary">
            {t("money.loan.smaller")}
          </ButtonLink>
        </>
      }
    >
      <IllustrationCard name="receipt" className="h-40 py-2" />
      <h2 className="text-2xl leading-9 font-semibold text-foreground">
        {t("money.loan.upTo", { amount: cedis(loanOffer.max) })}
      </h2>
      <section className="space-y-2.5 rounded-[20px] border bg-card p-4">
        <h3 className="text-base font-medium text-foreground">
          {t("money.loan.why")}
        </h3>
        <ul className="space-y-2">
          {reasons.map((r) => (
            <li key={r} className="flex gap-2 text-sm text-foreground">
              <CheckCircle2
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-primary"
              />
              {r}
            </li>
          ))}
        </ul>
      </section>
      <TermsCard
        rows={loanTerms(loanOffer.max, t)}
        total={[t("money.loan.totalToPay"), cedis(loanTotal(loanOffer.max))]}
      />
      <p className="flex gap-2 rounded-[20px] bg-warning-soft p-4 text-sm text-warning">
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
        {t("money.loan.careful")}
      </p>
    </FlowPage>
  )
}

/** P3 · 05a Choose a smaller amount. */
export function LoanAmount() {
  const { t } = useTranslation()
  const labelId = useId()
  const [amount, setAmount] = useState(String(loanOffer.choices[1]))
  const value = Number(amount)
  return (
    <FlowPage
      title={t("money.loan.title")}
      step={t("money.loan.onlyNeed")}
      sample
      footer={
        <ButtonLink to="/farmer/money/loan/sent" state={{ amount: value }}>
          {t("money.loan.apply", { amount: cedis(value) })}
        </ButtonLink>
      }
    >
      <FieldLabel id={labelId} audioKey="money-loan-amount">
        {t("money.loan.howMuch")}
      </FieldLabel>
      <ChoiceChips
        labelledBy={labelId}
        options={loanOffer.choices.map((c) => ({
          value: String(c),
          label: cedis(c),
        }))}
        value={amount}
        onChange={(v) => setAmount(v)}
      />
      <TermsCard
        rows={loanTerms(value, t)}
        total={[t("money.loan.totalToPay"), cedis(loanTotal(value))]}
      />
      <p className="text-sm text-muted-foreground">
        {t("money.loan.smallerEasier")}
      </p>
    </FlowPage>
  )
}

/** P3 · 05b / 05c Loan request sent. */
export function LoanSent() {
  const { t } = useTranslation()
  const amount =
    (useLocation().state as { amount?: number } | null)?.amount ?? loanOffer.max
  return (
    <Confirmation
      sample
      badge={t("money.loan.sentBadge")}
      title={t("money.loan.sentTitle")}
      text={t("money.loan.sentText")}
      rows={[
        ...loanTerms(amount, t),
        [t("money.loan.status"), t("money.loan.waiting")],
      ]}
      total={[t("money.loan.totalToPay"), cedis(loanTotal(amount))]}
      primary={{ to: "/farmer/money", label: t("money.backToMoney") }}
    />
  )
}

/** P3 · 06 Rain insurance. */
export function Insurance() {
  const { t } = useTranslation()
  const how = [
    t("money.insure.how1"),
    t("money.insure.how2"),
    t("money.insure.how3"),
  ]
  return (
    <FlowPage
      title={t("money.insure.title")}
      back="/farmer/money"
      sample
      footer={
        <ButtonLink to="/farmer/money/insurance/done">
          {t("money.insure.cta", { amount: cedis(insurance.premium) })}
        </ButtonLink>
      }
    >
      <IllustrationCard name="yield-growth" className="h-40 py-2" />
      <h2 className="text-2xl leading-9 font-semibold text-foreground">
        {t("money.insure.headline")}
      </h2>
      <ol className="space-y-3 rounded-[20px] border bg-card p-4">
        {how.map((h, i) => (
          <li key={h} className="flex gap-3 text-sm text-foreground">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-primary">
              {i + 1}
            </span>
            {h}
          </li>
        ))}
      </ol>
      <TermsCard
        rows={[
          [
            t("money.insure.youPay"),
            t("money.insure.perSeason", { amount: cedis(insurance.premium) }),
          ],
          [t("money.insure.crop"), insurance.crop],
          [
            t("money.insure.couldReceive"),
            t("money.insure.upTo", { amount: cedis(insurance.payout) }),
          ],
        ]}
      />
      <p className="text-sm text-muted-foreground">
        {t("money.insure.insurer")}
      </p>
    </FlowPage>
  )
}

/** P3 · 06b Crops insured. */
export function Insured() {
  const { t } = useTranslation()
  return (
    <Confirmation
      illustration="yield-growth"
      sample
      badge={t("money.approvedOnPhone")}
      title={t("money.insure.doneTitle")}
      text={t("money.insure.doneText")}
      rows={[
        [t("money.insure.crop"), insurance.crop],
        [t("money.insure.season"), insurance.season],
        [t("money.reference"), insurance.reference],
        [
          t("money.insure.couldReceive"),
          t("money.insure.upTo", { amount: cedis(insurance.payout) }),
        ],
      ]}
      total={[t("money.insure.paid"), cedis(insurance.premium)]}
      primary={{ to: "/farmer/money", label: t("money.backToMoney") }}
    />
  )
}

/** P3 · 12 Get paid: ask a buyer to pay by mobile money. */
export function GetPaid() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const cropLabel = useId()
  const own = getSession()?.user.phone ?? null
  const [crop, setCrop] = useState<(typeof crops)[number] | null>(null)
  const [amount, setAmount] = useState("")
  const [buyer, setBuyer] = useState("")
  const [tried, setTried] = useState(false)
  const problems = {
    crop: crop ? null : ("validate.required" as const),
    amount: checkAmount(amount),
    buyer: ghanaPhone(buyer, own),
  }
  const show = (k: keyof typeof problems) =>
    tried && problems[k] ? t(problems[k], { min: 1, max: "10,000" }) : undefined

  function send() {
    setTried(true)
    if (Object.values(problems).some(Boolean)) return
    void navigate("/farmer/money/get-paid/sent", {
      state: { crop, amount: Number(amount), buyer: toE164(buyer) },
    })
  }

  return (
    <FlowPage
      title={t("money.getPaid.title")}
      step={t("money.getPaid.subtitle")}
      back="/farmer/money"
      sample
      footer={
        <Button size="xl" className="w-full" onClick={send}>
          {t("money.getPaid.send")}
        </Button>
      }
    >
      <FieldLabel id={cropLabel} audioKey="money-get-paid-crop">
        {t("money.getPaid.what")}
      </FieldLabel>
      <ChoiceChips
        labelledBy={cropLabel}
        options={crops.map((c) => ({
          value: c,
          label: t(`money.getPaid.crops.${c}`),
        }))}
        value={crop}
        onChange={(v) => setCrop(v)}
      />
      <FieldError id="gp-crop-error" message={show("crop")} />
      <FieldLabel htmlFor="gp-amount" audioKey="money-get-paid-amount">
        {t("money.getPaid.amountCedis")}
      </FieldLabel>
      <TextField
        id="gp-amount"
        value={amount}
        inputMode="numeric"
        placeholder="1200"
        invalid={Boolean(show("amount"))}
        aria-describedby={show("amount") ? "gp-amount-error" : undefined}
        onChange={(e) => setAmount(e.target.value)}
      />
      <FieldError id="gp-amount-error" message={show("amount")} />
      <FieldLabel htmlFor="gp-buyer" audioKey="money-get-paid-buyer">
        {t("money.getPaid.buyer")}
      </FieldLabel>
      <TextField
        id="gp-buyer"
        value={buyer}
        inputMode="tel"
        autoComplete="tel"
        placeholder="024 000 0000"
        invalid={Boolean(show("buyer"))}
        aria-describedby={show("buyer") ? "gp-buyer-error" : undefined}
        onChange={(e) => setBuyer(e.target.value)}
      />
      <FieldError id="gp-buyer-error" message={show("buyer")} />
      <InfoCard
        tone="cream"
        title={t("money.getPaid.share")}
        text={t("money.getPaid.shareText", {
          number: wallet.number,
          provider: wallet.provider,
          name: wallet.name,
        })}
        picture={{ photo: "options/trading", emoji: "handshake" }}
      />
      <p className="text-sm text-muted-foreground">{t("money.getPaid.note")}</p>
    </FlowPage>
  )
}

/** P3 · 12b Payment request sent. */
export function PaymentRequested() {
  const { t } = useTranslation()
  const sent =
    (useLocation().state as {
      crop?: (typeof crops)[number]
      amount?: number
      buyer?: string
    } | null) ?? {}
  return (
    <Confirmation
      sample
      badge={t("money.getPaid.sentBadge")}
      title={t("money.getPaid.sentTitle")}
      text={t("money.getPaid.sentText")}
      rows={[
        [
          t("money.getPaid.for"),
          t(`money.getPaid.crops.${sent.crop ?? "maize"}`),
        ],
        [t("money.getPaid.buyer"), sent.buyer ?? "024 555 0182"],
        [t("money.getPaid.payTo"), `${wallet.provider} · ${wallet.number}`],
        [t("money.loan.status"), t("money.getPaid.waiting")],
      ]}
      total={[t("money.getPaid.amount"), cedis(sent.amount ?? 1200)]}
      primary={{ to: "/farmer/money", label: t("money.backToMoney") }}
      secondary={{
        to: "/farmer/money/get-paid",
        label: t("money.getPaid.another"),
      }}
    />
  )
}
