import { useEffect, useEffectEvent, useState, type FormEvent } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ApiError } from "@/api/client"
import { getPayment, sendPaymentCode, type PaymentInfo } from "@/api/money"
import { ButtonLink, FlowPage, InfoCard } from "@/components/Flow"
import { Button } from "@/components/ui/button"
import { cedis } from "@/features/sample/data"
import { networkLabel, useMoney, walletText } from "./wallet"

/** Where to go once paid, and what that screen needs (React Router location state). */
export interface AfterPayment {
  next: string
  nextState?: Record<string, unknown>
}

/** How often to ask the server while the farmer approves on their phone. */
const CHECK_EVERY_MS = 3000

/**
 * P3 · 02b Approve on your phone (ADR 0034): the network sends a prompt and the farmer enters their PIN
 * there, never in the app. This screen asks the server every few seconds how the payment stands, takes the
 * one-time code some networks text instead, and moves on when it is paid.
 */
export function PaymentApproval() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const reference = useParams().reference ?? ""
  const after = (useLocation().state as AfterPayment | null) ?? {
    next: "/farmer/money",
  }
  const money = useMoney()
  const [payment, setPayment] = useState<PaymentInfo | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const status = payment?.status

  // Paid: refresh the wallet history and go on to the receipt screen, once.
  const onPaid = useEffectEvent(() => {
    money.reload()
    void navigate(after.next, {
      replace: true,
      state: { ...after.nextState, reference },
    })
  })

  useEffect(() => {
    if (status === "paid" || status === "failed" || status === "needs_code")
      return
    let stopped = false
    const check = async () => {
      try {
        const latest = await getPayment(reference)
        if (!stopped) setPayment(latest)
      } catch {
        // No network for a moment: try again on the next tick.
      }
    }
    void check()
    const timer = setInterval(() => void check(), CHECK_EVERY_MS)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [reference, status])

  useEffect(() => {
    if (status === "paid") onPaid()
  }, [status])

  async function submitCode(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      setPayment(await sendPaymentCode(reference, code))
    } catch (failure) {
      setError(
        failure instanceof ApiError ? failure.message : t("errors.generic")
      )
    }
  }

  const wallet = money.data?.wallet
  const title = payment
    ? t("money.pay.amountTitle", {
        amount: cedis(payment.amount),
        to: payment.description,
      })
    : t("money.pay.title")

  return (
    <FlowPage
      title={t("money.pay.title")}
      sample={money.data?.sample}
      footer={
        status === "failed" ? (
          <ButtonLink to="/farmer/money">{t("money.backToMoney")}</ButtonLink>
        ) : undefined
      }
    >
      <h2 className="text-xl font-medium text-foreground">{title}</h2>
      {status === "failed" ? (
        <div
          role="alert"
          className="space-y-2 rounded-[20px] bg-destructive-soft p-4"
        >
          <p className="text-base font-medium text-destructive">
            {t("money.pay.failedTitle")}
          </p>
          {payment?.message ? (
            <p className="text-sm text-foreground">{payment.message}</p>
          ) : null}
          <p className="text-sm text-foreground">{t("money.pay.failedHow")}</p>
        </div>
      ) : status === "needs_code" ? (
        <form onSubmit={(e) => void submitCode(e)} className="space-y-3">
          <p className="text-base text-foreground">
            {payment?.message ?? t("money.pay.codeHint")}
          </p>
          <label htmlFor="payment-code" className="text-sm font-medium">
            {t("money.pay.codeLabel")}
          </label>
          <input
            id="payment-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={code}
            // digits only: network codes are 4 to 8 numbers
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            aria-invalid={code.length > 0 && code.length < 4 ? true : undefined}
            className="h-12 w-full rounded-full border bg-card px-5 text-base tracking-widest outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button
            type="submit"
            size="xl"
            className="w-full"
            disabled={code.length < 4}
          >
            {t("money.pay.sendCode")}
          </Button>
          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
        </form>
      ) : (
        <>
          <InfoCard
            tone="selected"
            title={wallet ? walletText(wallet) : t("money.pay.yourWallet")}
            text={t("money.link.prompt")}
            picture={{ photo: "options/phone", emoji: "mobile-phone" }}
          />
          <p role="status" className="text-sm text-muted-foreground">
            {t("money.link.lookNow")}
          </p>
          <InfoCard
            tone="cream"
            title={t("money.link.noPrompt")}
            text={
              wallet?.network === "mtn" || !wallet
                ? t("money.link.noPromptHow")
                : t("money.pay.noPromptOther", {
                    network: networkLabel(wallet.network),
                  })
            }
            picture={{ photo: "options/nokia", emoji: "input-numbers" }}
          />
        </>
      )}
    </FlowPage>
  )
}
