import {
  CalendarDays,
  ChevronRight,
  Phone,
  PiggyBank,
  ShoppingCart,
  Users,
  Wheat,
} from "lucide-react"
import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ApiError } from "@/api/client"
import {
  addSavings,
  getMyCooperative,
  updateOrder,
  updateRsvp,
  updateSale,
  type CooperativeDetails,
} from "@/api/cooperative"
import {
  Confirmation,
  CountStepper,
  FlowPage,
  InfoCard,
  TermsCard,
} from "@/components/Flow"
import { ChoiceChips } from "@/components/form/ChoiceChips"
import { FieldError } from "@/components/form/FieldError"
import { IllustrationCard } from "@/components/IllustrationCard"
import { Button, buttonVariants } from "@/components/ui/button"
import { NoDataYet } from "@/features/farmer/DataStatus"
import { FarmerPage } from "@/features/farmer/FarmerPage"
import { useServerData, type ServerData } from "@/features/farmer/useServerData"
import type { AfterPayment } from "@/features/money/pay"
import { formatLongDate, formatTime } from "@/lib/dates"
import { maskPhone } from "@/lib/phone"
import { cn } from "@/lib/utils"

const COOP = "/farmer/cooperative"
const KEY = "my-cooperative"
const SAVING_CHOICES = ["10", "20", "50", "100"] as const

/** GH₵ with no pesewas when there are none: "GH₵ 12,400", "GH₵ 6.80". */
const cedis = (amount: number) =>
  `GH₵ ${amount.toLocaleString("en-GH", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`

const when = (iso: string) => `${formatLongDate(iso)}, ${formatTime(iso)}`
const day = (date: string) => formatLongDate(`${date}T12:00:00Z`)
const tonnes = (kg: number) => (kg / 1000).toLocaleString("en-GH")

function useCooperative() {
  return useServerData(KEY, getMyCooperative)
}

/** "Not in a cooperative yet" is an answer, not an error: say so plainly. */
function Missing({ state }: { state: ServerData<CooperativeDetails> }) {
  const { t } = useTranslation()
  if (state.error?.status === 404)
    return (
      <p className="rounded-[20px] border border-dashed p-6 text-center text-muted-foreground">
        {t("coop.notMember")}
      </p>
    )
  return <NoDataYet state={state} />
}

/** Runs one save, keeping "busy" and the server's message for the screen. */
function useAction() {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  async function run(action: () => Promise<void>) {
    setBusy(true)
    setProblem(null)
    try {
      await action()
    } catch (error) {
      setProblem(
        error instanceof ApiError ? error.message : t("errors.generic")
      )
    } finally {
      setBusy(false)
    }
  }
  return { busy, problem, run }
}

function More() {
  return <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
}

/**
 * P4 · 01 My cooperative (CooperativeService, ADR 0040): the group, then savings, the group order, the next
 * meeting and selling together, each opening its own steps.
 */
export function CooperativeHome() {
  const { t } = useTranslation()
  const state = useCooperative()
  const coop = state.data

  return (
    <FarmerPage title={t("farmerApp.cooperative.title")} state={state}>
      <IllustrationCard name="cooperative" className="h-40 py-2" />
      {!coop ? (
        <Missing state={state} />
      ) : (
        <>
          <section className="space-y-1 rounded-[20px] bg-secondary p-4">
            <h2 className="text-lg font-medium text-primary">{coop.name}</h2>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users aria-hidden className="size-4" />
              {t("farmerApp.cooperative.members", {
                count: coop.members.length,
              })}{" "}
              · {t("coop.chairIs", { name: coop.leaderName })}
            </p>
          </section>
          <InfoCard
            to={`${COOP}/savings`}
            icon={<PiggyBank className="size-5.5" />}
            title={t("coop.savingsRow", { amount: cedis(coop.savings.group) })}
            text={t("coop.yourShare", { amount: cedis(coop.savings.mine) })}
            trailing={<More />}
          />
          {coop.openOrder ? (
            <InfoCard
              to={`${COOP}/order`}
              icon={<ShoppingCart className="size-5.5" />}
              title={t("coop.orderRow", { product: coop.openOrder.product })}
              text={
                coop.openOrder.myBags > 0
                  ? t("coop.orderMine", {
                      count: coop.openOrder.myBags,
                      closes: day(coop.openOrder.closesOn),
                    })
                  : t("coop.orderHint", {
                      closes: day(coop.openOrder.closesOn),
                    })
              }
              trailing={<More />}
            />
          ) : null}
          {coop.nextMeeting ? (
            <InfoCard
              to={`${COOP}/meeting`}
              icon={<CalendarDays className="size-5.5" />}
              title={t("coop.meetingRow", {
                when: when(coop.nextMeeting.startsAt),
              })}
              text={`${coop.nextMeeting.place} · ${coop.nextMeeting.topic}`}
              trailing={<More />}
            />
          ) : null}
          {coop.openSale ? (
            <InfoCard
              to={`${COOP}/sell`}
              icon={<Wheat className="size-5.5" />}
              title={t("coop.saleRow", { crop: coop.openSale.crop })}
              text={t("coop.saleHint", {
                price: cedis(coop.openSale.pricePerKg),
                pledged: tonnes(coop.openSale.pledgedKg),
                target: tonnes(coop.openSale.targetKg),
              })}
              trailing={<More />}
            />
          ) : null}
          {!coop.openOrder && !coop.openSale && !coop.nextMeeting ? (
            <p className="text-sm text-muted-foreground">
              {t("coop.nothingOpen")}
            </p>
          ) : null}
          {coop.leaderPhoneE164 ? (
            <a
              href={`tel:${coop.leaderPhoneE164}`}
              className={cn(
                buttonVariants({ size: "xl", variant: "secondary" }),
                "w-full text-primary"
              )}
            >
              <Phone aria-hidden />
              {t("coop.callChair", {
                name: coop.leaderName,
                phone: maskPhone(coop.leaderPhoneE164),
              })}
            </a>
          ) : null}
        </>
      )}
    </FarmerPage>
  )
}

/** P4 · 01b Group savings: choose an amount, then approve the payment on the phone. */
export function Savings() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const state = useCooperative()
  const coop = state.data
  const [amount, setAmount] = useState<(typeof SAVING_CHOICES)[number]>("20")
  const action = useAction()
  const noWallet = action.problem !== null && /wallet/i.test(action.problem)

  async function save() {
    await action.run(async () => {
      const payment = await addSavings(Number(amount))
      const after: AfterPayment = {
        next: `${COOP}/savings/done`,
        nextState: { amount: Number(amount) },
      }
      void navigate(`/farmer/money/pay/${payment.reference}`, { state: after })
    })
  }

  return (
    <FlowPage
      title={t("coop.savings.title")}
      step={coop?.name}
      back={COOP}
      footer={
        coop ? (
          <Button
            size="xl"
            className="w-full"
            disabled={action.busy}
            onClick={() => void save()}
          >
            {t("coop.savings.add", { amount: cedis(Number(amount)) })}
          </Button>
        ) : undefined
      }
    >
      {!coop ? (
        <Missing state={state} />
      ) : (
        <>
          <TermsCard
            rows={[
              [t("coop.savings.group"), cedis(coop.savings.group)],
              [t("coop.savings.mine"), cedis(coop.savings.mine)],
            ]}
          />
          <h2
            id="saving-amount"
            className="text-base font-medium text-foreground"
          >
            {t("coop.savings.howMuch")}
          </h2>
          <ChoiceChips
            labelledBy="saving-amount"
            options={SAVING_CHOICES.map((a) => ({
              value: a,
              label: cedis(Number(a)),
            }))}
            value={amount}
            onChange={(a) => setAmount(a)}
          />
          <FieldError
            id="savings-error"
            message={action.problem ?? undefined}
          />
          {noWallet ? (
            <Link
              to="/farmer/money/link"
              className="text-sm font-medium text-primary underline"
            >
              {t("coop.savings.linkWallet")}
            </Link>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {t("coop.savings.how")}
          </p>
        </>
      )}
    </FlowPage>
  )
}

/** P4 · 01c Savings added (after the payment is approved). */
export function SavingsAdded() {
  const { t } = useTranslation()
  const sent = (useLocation().state ?? {}) as {
    amount?: number
    reference?: string
  }
  const coop = useCooperative().data
  return (
    <Confirmation
      illustration="cooperative"
      badge={t("money.approvedOnPhone")}
      title={t("coop.savings.doneTitle", { amount: cedis(sent.amount ?? 0) })}
      text={t("coop.savings.doneTextLive")}
      rows={[
        [t("coop.group"), coop?.name ?? ""],
        [t("money.reference"), sent.reference ?? ""],
      ]}
      total={
        coop ? [t("coop.savings.mine"), cedis(coop.savings.mine)] : undefined
      }
      primary={{ to: COOP, label: t("coop.back") }}
    />
  )
}

/** P4 · 01d Next meeting: the details, and "I will come" or "I cannot come". */
export function Meeting() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const state = useCooperative()
  const coop = state.data
  const meeting = coop?.nextMeeting
  const action = useAction()

  async function answer(coming: boolean) {
    if (!meeting) return
    await action.run(async () => {
      await updateRsvp(meeting.id, coming)
      state.reload()
      void navigate(`${COOP}/meeting/done`, { state: { coming } })
    })
  }

  return (
    <FlowPage
      title={t("coop.meeting.title")}
      step={coop?.name}
      back={COOP}
      footer={
        meeting ? (
          <div className="grid gap-3">
            <Button
              size="xl"
              className="w-full"
              disabled={action.busy}
              onClick={() => void answer(true)}
            >
              {t("coop.meeting.come")}
            </Button>
            <Button
              size="xl"
              variant="secondary"
              className="w-full text-primary"
              disabled={action.busy}
              onClick={() => void answer(false)}
            >
              {t("coop.meeting.cannot")}
            </Button>
          </div>
        ) : undefined
      }
    >
      {!coop ? (
        <Missing state={state} />
      ) : !meeting ? (
        <p className="text-muted-foreground">{t("coop.meeting.none")}</p>
      ) : (
        <>
          <TermsCard
            rows={[
              [t("coop.meeting.when"), when(meeting.startsAt)],
              [t("coop.meeting.where"), meeting.place],
              [t("coop.meeting.topic"), meeting.topic],
              ...(meeting.bring
                ? [[t("coop.meeting.bring"), meeting.bring] as [string, string]]
                : []),
              [
                t("coop.meeting.coming"),
                t("coop.meeting.comingCount", {
                  count: meeting.comingCount,
                  total: coop.members.length,
                }),
              ],
            ]}
          />
          {meeting.coming === true || meeting.coming === false ? (
            <p role="status" className="text-sm font-medium text-primary">
              {t(
                meeting.coming
                  ? "coop.meeting.youSaidYes"
                  : "coop.meeting.youSaidNo"
              )}
            </p>
          ) : null}
          <FieldError id="rsvp-error" message={action.problem ?? undefined} />
        </>
      )}
    </FlowPage>
  )
}

/** P4 · 01e Meeting answered. */
export function MeetingConfirmed() {
  const { t } = useTranslation()
  const coming =
    (useLocation().state as { coming?: boolean } | null)?.coming ?? true
  const coop = useCooperative().data
  const meeting = coop?.nextMeeting
  return (
    <Confirmation
      illustration="cooperative"
      badge={t(
        coming ? "coop.meeting.comingBadge" : "coop.meeting.notComingBadge"
      )}
      title={t(
        coming ? "coop.meeting.doneTitle" : "coop.meeting.notComingTitle"
      )}
      text={t(coming ? "coop.meeting.doneText" : "coop.meeting.notComingText")}
      rows={
        coop && meeting
          ? [
              [t("coop.meeting.when"), when(meeting.startsAt)],
              [t("coop.meeting.where"), meeting.place],
              [
                t("coop.meeting.coming"),
                t("coop.meeting.comingCount", {
                  count: meeting.comingCount,
                  total: coop.members.length,
                }),
              ],
            ]
          : []
      }
      primary={{ to: COOP, label: t("coop.back") }}
    />
  )
}

/** P4 · 02 Join the group order: how many bags, or leave it. */
export function GroupOrder() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const state = useCooperative()
  const order = state.data?.openOrder
  const [chosen, setChosen] = useState<number | null>(null)
  const bags = chosen ?? (order?.myBags || 1)
  const action = useAction()

  async function join(count: number) {
    if (!order) return
    await action.run(async () => {
      await updateOrder(order.id, count)
      state.reload()
      void navigate(`${COOP}/order/done`, { state: { bags: count } })
    })
  }

  return (
    <FlowPage
      title={t("coop.order.title")}
      back={COOP}
      footer={
        order ? (
          <div className="grid gap-3">
            <Button
              size="xl"
              className="w-full"
              disabled={action.busy}
              onClick={() => void join(bags)}
            >
              {order.myBags > 0
                ? t("coop.order.changeTo", { count: bags })
                : t("coop.order.join", { count: bags })}
            </Button>
            {order.myBags > 0 ? (
              <Button
                size="xl"
                variant="secondary"
                className="w-full text-primary"
                disabled={action.busy}
                onClick={() => void join(0)}
              >
                {t("coop.order.leave")}
              </Button>
            ) : null}
          </div>
        ) : undefined
      }
    >
      {!state.data ? (
        <Missing state={state} />
      ) : !order ? (
        <p className="text-muted-foreground">{t("coop.order.none")}</p>
      ) : (
        <>
          <section className="space-y-2 rounded-[20px] border bg-card p-4">
            <h2 className="text-xl font-medium text-foreground">
              {order.product}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("coop.order.from", { dealer: order.dealer })}
            </p>
            <p className="text-2xl font-semibold text-primary">
              {t("coop.order.perBag", { price: cedis(order.unitPrice) })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("coop.order.alone", { price: cedis(order.alonePrice) })}
            </p>
            <div
              role="meter"
              aria-label={t("coop.order.title")}
              aria-valuenow={order.orderedBags}
              aria-valuemin={0}
              aria-valuemax={order.targetBags}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.min(100, (order.orderedBags / order.targetBags) * 100)}%`,
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("coop.order.progress", {
                ordered: order.orderedBags,
                target: order.targetBags,
                closes: day(order.closesOn),
              })}
            </p>
          </section>
          <h2 className="text-base font-medium text-foreground">
            {t("coop.order.howMany")}
          </h2>
          <CountStepper
            label={t("coop.order.bags")}
            value={bags}
            min={1}
            max={500}
            onChange={setChosen}
            unit={t("coop.order.unit", { count: bags })}
            hint={t("coop.order.youSave", {
              total: cedis(order.unitPrice * bags),
              saving: cedis((order.alonePrice - order.unitPrice) * bags),
            })}
          />
          <FieldError id="order-error" message={action.problem ?? undefined} />
          <p className="text-sm text-muted-foreground">
            {t("coop.order.payLater")}
          </p>
        </>
      )}
    </FlowPage>
  )
}

/** P4 · 02b Order joined (or left). */
export function OrderJoined() {
  const { t } = useTranslation()
  const bags = (useLocation().state as { bags?: number } | null)?.bags ?? 0
  const order = useCooperative().data?.openOrder
  if (bags === 0)
    return (
      <Confirmation
        illustration="cooperative"
        badge={t("coop.order.leftBadge")}
        title={t("coop.order.leftTitle")}
        text={t("coop.order.leftText")}
        rows={[]}
        primary={{ to: COOP, label: t("coop.back") }}
      />
    )
  return (
    <Confirmation
      illustration="cooperative"
      badge={t("coop.order.joinedBadge")}
      title={t("coop.order.joinedTitle", { count: bags })}
      text={t("coop.order.joinedText", {
        closes: order ? day(order.closesOn) : "",
      })}
      rows={
        order
          ? [
              [t("coop.order.order"), order.product],
              [t("coop.order.bags"), t("coop.order.bagsUnit", { count: bags })],
              [
                t("coop.order.price"),
                t("coop.order.perBag", { price: cedis(order.unitPrice) }),
              ],
              [t("coop.order.youPay"), t("coop.order.whenCloses")],
            ]
          : []
      }
      total={
        order
          ? [t("money.buy.total"), cedis(order.unitPrice * bags)]
          : undefined
      }
      primary={{ to: COOP, label: t("coop.back") }}
      secondary={{ to: `${COOP}/order`, label: t("coop.order.change") }}
    />
  )
}

/** P4 · 01f Sell together: how many bags to bring for the group sale. */
export function SellTogether() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const state = useCooperative()
  const sale = state.data?.openSale
  const [chosen, setChosen] = useState<number | null>(null)
  const bags = chosen ?? (sale?.myBags || 5)
  const kg = bags * (sale?.kgPerBag ?? 100)
  const action = useAction()

  async function pledge() {
    if (!sale) return
    await action.run(async () => {
      await updateSale(sale.id, bags)
      state.reload()
      void navigate(`${COOP}/sell/done`, { state: { bags } })
    })
  }

  return (
    <FlowPage
      title={t("coop.sale.title")}
      step={sale ? t("coop.sale.subtitle", { crop: sale.crop }) : undefined}
      back={COOP}
      footer={
        sale ? (
          <Button
            size="xl"
            className="w-full"
            disabled={action.busy}
            onClick={() => void pledge()}
          >
            {t("coop.sale.add", { count: bags })}
          </Button>
        ) : undefined
      }
    >
      {!state.data ? (
        <Missing state={state} />
      ) : !sale ? (
        <p className="text-muted-foreground">{t("coop.sale.none")}</p>
      ) : (
        <>
          <TermsCard
            rows={[
              [t("coop.sale.buyer"), sale.buyer],
              [
                t("coop.sale.groupPrice"),
                t("coop.sale.perKg", { price: cedis(sale.pricePerKg) }),
              ],
              [
                t("coop.sale.alonePrice"),
                t("coop.sale.aboutPerKg", {
                  price: cedis(sale.marketPricePerKg),
                }),
              ],
              [
                t("coop.sale.pledged"),
                t("coop.sale.tonnes", {
                  pledged: tonnes(sale.pledgedKg),
                  target: tonnes(sale.targetKg),
                }),
              ],
            ]}
          />
          <CountStepper
            label={t("coop.order.bags")}
            value={bags}
            min={1}
            max={500}
            onChange={setChosen}
            unit={t("coop.order.unit", { count: bags })}
            hint={t("coop.sale.estimate", {
              kg,
              total: cedis(kg * sale.pricePerKg),
            })}
          />
          <FieldError id="sale-error" message={action.problem ?? undefined} />
          <p className="text-sm text-muted-foreground">{t("coop.sale.how")}</p>
        </>
      )}
    </FlowPage>
  )
}

/** P4 · 01g Bags added. */
export function BagsAdded() {
  const { t } = useTranslation()
  const bags = (useLocation().state as { bags?: number } | null)?.bags ?? 0
  const sale = useCooperative().data?.openSale
  const kg = bags * (sale?.kgPerBag ?? 100)
  return (
    <Confirmation
      illustration="cooperative"
      badge={t("coop.sale.addedBadge")}
      title={t("coop.sale.doneTitle", { count: bags })}
      text={t("coop.sale.doneText")}
      rows={
        sale
          ? [
              [t("coop.sale.crop"), sale.crop],
              [
                t("coop.order.bags"),
                t("coop.sale.bagsKg", { count: bags, kg }),
              ],
              [
                t("coop.sale.groupPrice"),
                t("coop.sale.perKg", { price: cedis(sale.pricePerKg) }),
              ],
              [t("coop.sale.dropOff"), t("coop.sale.store")],
            ]
          : []
      }
      total={
        sale ? [t("coop.sale.youGet"), cedis(kg * sale.pricePerKg)] : undefined
      }
      primary={{ to: COOP, label: t("coop.back") }}
    />
  )
}
