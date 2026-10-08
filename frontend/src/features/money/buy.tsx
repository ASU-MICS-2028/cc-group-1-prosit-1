import { Phone, Smartphone, Truck } from "lucide-react"
import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ApiError } from "@/api/client"
import { startPayment } from "@/api/money"
import {
  ButtonLink,
  Confirmation,
  CountStepper,
  FlowPage,
  InfoCard,
  TermsCard,
} from "@/components/Flow"
import { IllustrationCard } from "@/components/IllustrationCard"
import { Picture } from "@/components/Picture"
import { Button } from "@/components/ui/button"
import { cedis, inputs, shops, type Shop } from "@/features/sample/data"
import type { AfterPayment } from "./pay"
import { useMoney, walletText } from "./wallet"

/** What the buy-inputs steps hand to each other (React Router location state). */
interface Basket {
  qty: Record<string, number>
  shop?: string
  /** Set once paid: the payment's reference */
  reference?: string
}

const START: Basket = { qty: { maize_seed: 1, npk: 2 } }

function useBasket(): Basket {
  return (useLocation().state as Basket | null) ?? START
}

function itemsTotal(qty: Record<string, number>) {
  return inputs.reduce((sum, p) => sum + (qty[p.code] ?? 0) * p.price, 0)
}

function shopById(id: string | undefined): Shop {
  return shops.find((s) => s.id === id) ?? shops[0]
}

/** P3 · 03a Buy inputs, step 1: what and how many. */
export function ChooseInputs() {
  const { t } = useTranslation()
  const [qty, setQty] = useState<Record<string, number>>(useBasket().qty)
  const total = itemsTotal(qty)
  const any = Object.values(qty).some((n) => n > 0)

  return (
    <FlowPage
      title={t("money.buy.title")}
      step={t("money.buy.step1")}
      back="/farmer/money"
      sample
      footer={
        any ? (
          <ButtonLink
            to="/farmer/money/buy/shop"
            state={{ qty } satisfies Basket}
          >
            {t("money.buy.chooseShop")}
          </ButtonLink>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            {t("money.buy.pickOne")}
          </p>
        )
      }
    >
      <ul className="divide-y rounded-[20px] border bg-card px-4">
        {inputs.map((p) => (
          <li key={p.code} className="flex items-center gap-3 py-3.5">
            <Picture
              source={p.picture}
              fit="cover"
              className="size-12 rounded-xl"
              emojiClassName="size-10"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium text-foreground">
                {p.name}
              </span>
              <span className="block text-sm text-muted-foreground">
                {p.unit} · {cedis(p.price)}
              </span>
            </span>
            <CountStepper
              compact
              label={p.name}
              value={qty[p.code] ?? 0}
              onChange={(n) => setQty((q) => ({ ...q, [p.code]: n }))}
            />
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between rounded-[20px] bg-secondary px-4 py-3">
        <span className="text-base font-medium text-foreground">
          {t("money.buy.total")}
        </span>
        <span className="text-xl font-semibold text-primary">
          {cedis(total)}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("money.buy.deliveryLater")}
      </p>
    </FlowPage>
  )
}

/** P3 · 03b Buy inputs, step 2: which approved dealer. */
export function ChooseShop() {
  const { t } = useTranslation()
  const basket = useBasket()
  const [shop, setShop] = useState(basket.shop ?? shops[0].id)

  return (
    <FlowPage
      title={t("money.buy.title")}
      step={t("money.buy.step2")}
      sample
      footer={
        <ButtonLink
          to="/farmer/money/buy/pay"
          state={{ ...basket, shop } satisfies Basket}
        >
          {t("money.buy.checkAndPay")}
        </ButtonLink>
      }
    >
      <div
        role="radiogroup"
        aria-label={t("money.buy.step2")}
        className="space-y-3"
      >
        {shops.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={s.id === shop}
            onClick={() => setShop(s.id)}
            className="block w-full text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <InfoCard
              tone={s.id === shop ? "selected" : "card"}
              title={s.name}
              text={t(
                s.fee === null ? "money.buy.shopPickUp" : "money.buy.shopLine",
                {
                  distance: s.distance,
                  delivery: s.delivery,
                  fee: s.fee === null ? "" : cedis(s.fee),
                }
              )}
              picture={{ photo: "options/trading", emoji: "convenience-store" }}
            />
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {t("money.buy.approvedOnly")}
      </p>
    </FlowPage>
  )
}

/**
 * P3 · 03 Buy inputs, step 3: check the order and pay with mobile money. The products and shops are sample
 * data until agro-dealers are connected; the payment itself is real (Paystack, ADR 0034), approved on the
 * farmer's phone on the next screen.
 */
export function PayForInputs() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const basket = useBasket()
  const shop = shopById(basket.shop)
  const lines = inputs.filter((p) => (basket.qty[p.code] ?? 0) > 0)
  const fee = shop.fee ?? 0
  const total = itemsTotal(basket.qty) + fee
  const wallet = useMoney().data?.wallet
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pay() {
    setBusy(true)
    setError(null)
    try {
      const payment = await startPayment({
        purpose: "inputs",
        description: shop.name,
        amount: total,
      })
      const after: AfterPayment = {
        next: "/farmer/money/buy/paid",
        nextState: { ...basket },
      }
      void navigate(`/farmer/money/pay/${payment.reference}`, {
        state: after,
      })
    } catch (failure) {
      setError(
        failure instanceof ApiError ? failure.message : t("errors.generic")
      )
      setBusy(false)
    }
  }

  return (
    <FlowPage
      title={t("money.buy.title")}
      step={t("money.buy.step3")}
      sample
      footer={
        wallet ? (
          <Button
            size="xl"
            className="w-full"
            disabled={busy}
            onClick={() => void pay()}
          >
            {t("money.buy.pay", { amount: cedis(total) })}
          </Button>
        ) : (
          <ButtonLink to="/farmer/money/link">
            {t("money.pay.linkNow")}
          </ButtonLink>
        )
      }
    >
      <InfoCard
        tone="cream"
        title={shop.name}
        text={t("money.buy.shopApproved", { distance: shop.distance })}
        picture={{ photo: "options/trading", emoji: "convenience-store" }}
      />
      <TermsCard
        rows={[
          ...lines.map(
            (p) =>
              [
                `${p.name} × ${basket.qty[p.code]}`,
                cedis(p.price * basket.qty[p.code]),
              ] as [string, string]
          ),
          [
            shop.fee === null
              ? t("money.buy.pickUp")
              : t("money.buy.delivery", { when: shop.delivery }),
            cedis(fee),
          ],
        ]}
        total={[t("money.buy.total"), cedis(total)]}
      />
      <h2 className="text-base font-medium text-foreground">
        {t("money.buy.payWith")}
      </h2>
      <InfoCard
        tone="cream"
        title={wallet ? walletText(wallet) : t("money.pay.needWallet")}
        icon={<Smartphone className="size-5.5" />}
      />
      <p className="text-sm text-muted-foreground">
        {t("money.buy.approvePin")}
      </p>
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </FlowPage>
  )
}

/** P3 · 04 Payment approved. */
export function InputsPaid() {
  const { t } = useTranslation()
  const basket = useBasket()
  const shop = shopById(basket.shop)
  const total = itemsTotal(basket.qty) + (shop.fee ?? 0)
  const wallet = useMoney().data?.wallet
  return (
    <Confirmation
      sample
      badge={t("money.approvedOnPhone")}
      title={t("money.buy.paidTitle", { amount: cedis(total) })}
      text={t(
        shop.fee === null ? "money.buy.paidPickUp" : "money.buy.paidText",
        {
          shop: shop.name,
          when: shop.delivery,
        }
      )}
      rows={[
        [t("money.buy.paidTo"), shop.name],
        ...(wallet
          ? [[t("money.buy.from"), walletText(wallet)] as [string, string]]
          : []),
        ...(basket.reference
          ? [[t("money.reference"), basket.reference] as [string, string]]
          : []),
      ]}
      total={[t("money.buy.total"), cedis(total)]}
      primary={{ to: "/farmer/money/delivery", label: t("money.buy.track") }}
      secondary={{ to: "/farmer/money", label: t("money.backToMoney") }}
    />
  )
}

/** P3 · 09 Track delivery. */
export function TrackDelivery() {
  const { t } = useTranslation()
  const steps = [
    [t("money.delivery.paid"), true],
    [t("money.delivery.packed"), true],
    [t("money.delivery.onTheWay"), false],
    [t("money.delivery.delivered"), false],
  ] as const
  return (
    <FlowPage
      title={t("money.delivery.title")}
      back="/farmer/money"
      sample
      footer={
        <a
          href="tel:+233240000000"
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-secondary text-base font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Phone aria-hidden className="size-5" />
          {t("money.delivery.callDriver")}
        </a>
      }
    >
      <IllustrationCard name="delivery" className="h-40 py-2" />
      <InfoCard
        tone="cream"
        title={t("money.delivery.arrives")}
        text={t("money.delivery.what")}
        icon={<Truck className="size-5.5" />}
      />
      <ol className="space-y-3 rounded-[20px] border bg-card p-4">
        {steps.map(([label, done]) => (
          <li key={label} className="flex items-center gap-3 text-base">
            <span
              aria-hidden
              className={
                done
                  ? "size-3 rounded-full bg-primary"
                  : "size-3 rounded-full border-2 border-muted-foreground/40"
              }
            />
            <span
              className={done ? "text-foreground" : "text-muted-foreground"}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>
    </FlowPage>
  )
}
