import { Check, Lock } from "lucide-react"
import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ApiError } from "@/api/client"
import { linkWallet, type MobileNetwork, type WalletInfo } from "@/api/money"
import { useSession } from "@/auth/session"
import { Confirmation, FlowPage } from "@/components/Flow"
import { IllustrationCard } from "@/components/IllustrationCard"
import { Button } from "@/components/ui/button"
import { maskPhone } from "@/lib/phone"
import { cn } from "@/lib/utils"
import { NETWORKS, networkLabel, useMoney } from "./wallet"

/**
 * P3 · 02 Link mobile money: which network the farmer's registered number is on. Linking charges nothing
 * and asks for no PIN: the wallet is registered with the payment provider, and each payment is approved on
 * the phone later (ADR 0034).
 */
export function LinkWallet() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const phone = useSession()?.user.phone ?? ""
  const money = useMoney()
  const [chosen, setChosen] = useState<MobileNetwork | null>(null)
  const network = chosen ?? money.data?.wallet?.network ?? "mtn"
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function link() {
    setBusy(true)
    setError(null)
    try {
      const wallet = await linkWallet(network)
      money.reload()
      void navigate("/farmer/money/link/done", { state: wallet })
    } catch (failure) {
      setError(
        failure instanceof ApiError ? failure.message : t("errors.generic")
      )
      setBusy(false)
    }
  }

  return (
    <FlowPage
      title={t("money.link.title")}
      back="/farmer/money"
      sample={money.data?.sample}
      footer={
        <Button
          size="xl"
          className="w-full"
          disabled={busy || !phone}
          onClick={() => void link()}
        >
          {t("money.link.linkNumber", { number: maskPhone(phone) })}
        </Button>
      }
    >
      <IllustrationCard name="link-wallet" className="h-40 py-2" />
      <h2 className="text-2xl leading-9 font-medium text-foreground">
        {t("money.link.which")}
      </h2>
      <div
        role="radiogroup"
        aria-label={t("money.link.which")}
        className="space-y-3"
      >
        {NETWORKS.map((n) => {
          const on = n.code === network
          return (
            <button
              key={n.code}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setChosen(n.code)}
              className={cn(
                "flex w-full items-center justify-between rounded-full px-5 py-3.5 text-left text-base font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                on
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              )}
            >
              {n.label}
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
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </FlowPage>
  )
}

/** P3 · 02c Mobile money linked: the wallet the server registered. */
export function WalletLinked() {
  const { t } = useTranslation()
  const fromLink = useLocation().state as WalletInfo | null
  const money = useMoney()
  const wallet = fromLink ?? money.data?.wallet
  if (!wallet) return null
  return (
    <Confirmation
      illustration="link-wallet"
      sample={money.data?.sample}
      badge={t("money.link.linkedBadge")}
      title={t("money.link.linkedTitle", {
        provider: networkLabel(wallet.network),
      })}
      text={t("money.link.linkedText")}
      rows={[
        [t("money.link.provider"), networkLabel(wallet.network)],
        [t("money.link.number"), maskPhone(wallet.phoneE164)],
        [t("money.link.nameOnWallet"), wallet.nameOnWallet],
        [t("money.link.pin"), t("money.link.neverStored")],
      ]}
      primary={{ to: "/farmer/money", label: t("money.backToMoney") }}
    />
  )
}
