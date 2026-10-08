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
import { useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { getCooperative } from "@/api/farmer"
import {
  ButtonLink,
  Confirmation,
  CountStepper,
  FlowPage,
  InfoCard,
  TermsCard,
} from "@/components/Flow"
import { IllustrationCard } from "@/components/IllustrationCard"
import { buttonVariants } from "@/components/ui/button"
import { NoDataYet } from "@/features/farmer/DataStatus"
import { FarmerPage } from "@/features/farmer/FarmerPage"
import { useServerData } from "@/features/farmer/useServerData"
import { cedis, cooperative as sample, wallet } from "@/features/sample/data"
import { formatLongDate } from "@/lib/dates"
import { maskPhone } from "@/lib/phone"
import { cn } from "@/lib/utils"

const COOP = "/farmer/cooperative"

/**
 * P4 · 01 My cooperative: the group (from the farmer service), then savings, the group order, the
 * next meeting and selling together, each opening its own steps. Savings, orders and sales are
 * sample data until their backend exists.
 */
export function CooperativeHome() {
  const { t } = useTranslation()
  const state = useServerData("cooperative", getCooperative)
  const coop = state.data
  const { savings, order, sale } = sample

  return (
    <FarmerPage
      title={t("farmerApp.cooperative.title")}
      source={coop?.source}
      state={state}
    >
      <IllustrationCard name="cooperative" className="h-40 py-2" />
      {!coop ? (
        <NoDataYet state={state} />
      ) : (
        <section className="space-y-1 rounded-[20px] bg-secondary p-4">
          <h2 className="text-lg font-medium text-primary">{coop.name}</h2>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users aria-hidden className="size-4" />
            {t("farmerApp.cooperative.members", { count: coop.members })} ·{" "}
            {t("coop.chairIs", { name: coop.chairName })}
          </p>
        </section>
      )}
      <InfoCard
        to={`${COOP}/savings`}
        icon={<PiggyBank className="size-5.5" />}
        title={t("coop.savingsRow", { amount: cedis(savings.group) })}
        text={t("coop.yourShare", { amount: cedis(savings.mine) })}
        trailing={
          <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
        }
      />
      <InfoCard
        to={`${COOP}/order`}
        icon={<ShoppingCart className="size-5.5" />}
        title={t("coop.orderRow", { product: order.product })}
        text={t("coop.orderHint", { closes: order.closes })}
        trailing={
          <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
        }
      />
      <InfoCard
        to={`${COOP}/meeting`}
        icon={<CalendarDays className="size-5.5" />}
        title={t("coop.meetingRow", {
          when: coop
            ? formatLongDate(`${coop.nextMeeting}T12:00:00Z`)
            : sample.meeting.when,
        })}
        text={`${coop?.meetingPlace ?? sample.meeting.place} · ${sample.meeting.topic}`}
        trailing={
          <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
        }
      />
      <InfoCard
        to={`${COOP}/sell`}
        icon={<Wheat className="size-5.5" />}
        title={t("coop.saleRow", { crop: sale.crop })}
        text={t("coop.saleHint", {
          price: cedis(sale.price),
          pledged: sale.pledged,
          target: sale.target,
        })}
        trailing={
          <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
        }
      />
      {coop ? (
        <a
          href={`tel:${coop.chairPhoneE164}`}
          className={cn(
            buttonVariants({ size: "xl", variant: "secondary" }),
            "w-full text-primary"
          )}
        >
          <Phone aria-hidden />
          {t("coop.callChair", {
            name: coop.chairName,
            phone: maskPhone(coop.chairPhoneE164),
          })}
        </a>
      ) : null}
    </FarmerPage>
  )
}

/** P4 · 01b Group savings. */
export function Savings() {
  const { t } = useTranslation()
  const { savings } = sample
  return (
    <FlowPage
      title={t("coop.savings.title")}
      step={sample.name}
      back={COOP}
      sample
      footer={
        <ButtonLink to={`${COOP}/savings/done`}>
          {t("coop.savings.add", { amount: cedis(savings.add) })}
        </ButtonLink>
      }
    >
      <TermsCard
        rows={[
          [t("coop.savings.group"), cedis(savings.group)],
          [t("coop.savings.mine"), cedis(savings.mine)],
          [t("coop.savings.thisMonth"), cedis(savings.add)],
          [t("coop.savings.payout"), savings.payout],
        ]}
      />
      <p className="text-sm text-muted-foreground">{t("coop.savings.how")}</p>
    </FlowPage>
  )
}

/** P4 · 01c Savings added. */
export function SavingsAdded() {
  const { t } = useTranslation()
  const { savings } = sample
  return (
    <Confirmation
      illustration="cooperative"
      sample
      badge={t("money.approvedOnPhone")}
      title={t("coop.savings.doneTitle", { amount: cedis(savings.add) })}
      text={t("coop.savings.doneText", {
        amount: cedis(savings.mine + savings.add),
      })}
      rows={[
        [t("coop.group"), sample.name],
        [t("coop.savings.from"), `${wallet.provider} · ${wallet.number}`],
        [t("money.reference"), "AGC-SAV-26-2207"],
      ]}
      total={[t("coop.savings.mine"), cedis(savings.mine + savings.add)]}
      primary={{ to: COOP, label: t("coop.back") }}
    />
  )
}

/** P4 · 01d Next meeting. */
export function Meeting() {
  const { t } = useTranslation()
  const { meeting } = sample
  return (
    <FlowPage
      title={t("coop.meeting.title")}
      step={sample.name}
      back={COOP}
      sample
      footer={
        <ButtonLink to={`${COOP}/meeting/done`}>
          {t("coop.meeting.come")}
        </ButtonLink>
      }
    >
      <TermsCard
        rows={[
          [t("coop.meeting.when"), meeting.when],
          [t("coop.meeting.where"), meeting.place],
          [t("coop.meeting.topic"), meeting.topic],
          [t("coop.meeting.bring"), meeting.bring],
        ]}
      />
      <p className="text-sm text-muted-foreground">
        {t("coop.meeting.language")}
      </p>
    </FlowPage>
  )
}

/** P4 · 01e Meeting confirmed. */
export function MeetingConfirmed() {
  const { t } = useTranslation()
  const { meeting } = sample
  return (
    <Confirmation
      illustration="cooperative"
      sample
      badge={t("coop.meeting.comingBadge")}
      title={t("coop.meeting.doneTitle")}
      text={t("coop.meeting.doneText")}
      rows={[
        [t("coop.meeting.when"), meeting.when],
        [t("coop.meeting.where"), meeting.place],
        [t("coop.meeting.topic"), meeting.topic],
        [
          t("coop.meeting.coming"),
          t("coop.meeting.comingCount", {
            count: meeting.coming,
            total: sample.members,
          }),
        ],
      ]}
      primary={{ to: COOP, label: t("coop.back") }}
    />
  )
}

/** P4 · 02 Join the group order. */
export function GroupOrder() {
  const { t } = useTranslation()
  const { order } = sample
  const [bags, setBags] = useState(2)
  const saving = (order.alonePrice - order.price) * bags
  return (
    <FlowPage
      title={t("coop.order.title")}
      back={COOP}
      sample
      footer={
        <ButtonLink to={`${COOP}/order/done`} state={{ bags }}>
          {t("coop.order.join", { count: bags })}
        </ButtonLink>
      }
    >
      <section className="space-y-2 rounded-[20px] border bg-card p-4">
        <h2 className="text-xl font-medium text-foreground">{order.product}</h2>
        <p className="text-sm text-muted-foreground">
          {t("coop.order.from", { dealer: order.dealer })}
        </p>
        <p className="text-2xl font-semibold text-primary">
          {t("coop.order.perBag", { price: cedis(order.price) })}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("coop.order.alone", { price: cedis(order.alonePrice) })}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${(order.ordered / order.target) * 100}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {t("coop.order.progress", {
            ordered: order.ordered,
            target: order.target,
            closes: order.closes,
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
        onChange={setBags}
        unit={t("coop.order.unit", { count: bags })}
        hint={t("coop.order.youSave", {
          total: cedis(order.price * bags),
          saving: cedis(saving),
        })}
      />
      <p className="text-sm text-muted-foreground">
        {t("coop.order.payLater")}
      </p>
    </FlowPage>
  )
}

/** P4 · 02b Order joined. */
export function OrderJoined() {
  const { t } = useTranslation()
  const { order } = sample
  const bags = (useLocation().state as { bags?: number } | null)?.bags ?? 2
  return (
    <Confirmation
      illustration="cooperative"
      sample
      badge={t("coop.order.joinedBadge")}
      title={t("coop.order.joinedTitle", { count: bags })}
      text={t("coop.order.joinedText", { closes: order.closes })}
      rows={[
        [t("coop.order.order"), order.product],
        [t("coop.order.bags"), t("coop.order.bagsUnit", { count: bags })],
        [
          t("coop.order.price"),
          t("coop.order.perBag", { price: cedis(order.price) }),
        ],
        [t("coop.order.youPay"), t("coop.order.whenCloses")],
      ]}
      total={[t("money.buy.total"), cedis(order.price * bags)]}
      primary={{ to: COOP, label: t("coop.back") }}
      secondary={{ to: `${COOP}/order`, label: t("coop.order.change") }}
    />
  )
}

/** P4 · 01f Sell together. */
export function SellTogether() {
  const { t } = useTranslation()
  const { sale } = sample
  const [bags, setBags] = useState(5)
  const kg = bags * sale.kgPerBag
  return (
    <FlowPage
      title={t("coop.sale.title")}
      step={t("coop.sale.subtitle", { crop: sale.crop })}
      back={COOP}
      sample
      footer={
        <ButtonLink to={`${COOP}/sell/done`} state={{ bags }}>
          {t("coop.sale.add", { count: bags })}
        </ButtonLink>
      }
    >
      <TermsCard
        rows={[
          [t("coop.sale.buyer"), sale.buyer],
          [
            t("coop.sale.groupPrice"),
            t("coop.sale.perKg", { price: cedis(sale.price) }),
          ],
          [
            t("coop.sale.alonePrice"),
            t("coop.sale.aboutPerKg", { price: cedis(sale.alonePrice) }),
          ],
          [
            t("coop.sale.pledged"),
            t("coop.sale.tonnes", {
              pledged: sale.pledged,
              target: sale.target,
            }),
          ],
        ]}
      />
      <CountStepper
        label={t("coop.order.bags")}
        value={bags}
        min={1}
        onChange={setBags}
        unit={t("coop.order.unit", { count: bags })}
        hint={t("coop.sale.estimate", { kg, total: cedis(kg * sale.price) })}
      />
      <p className="text-sm text-muted-foreground">{t("coop.sale.how")}</p>
    </FlowPage>
  )
}

/** P4 · 01g Bags added. */
export function BagsAdded() {
  const { t } = useTranslation()
  const { sale } = sample
  const bags = (useLocation().state as { bags?: number } | null)?.bags ?? 5
  const kg = bags * sale.kgPerBag
  return (
    <Confirmation
      illustration="cooperative"
      sample
      badge={t("coop.sale.addedBadge")}
      title={t("coop.sale.doneTitle", { count: bags })}
      text={t("coop.sale.doneText")}
      rows={[
        [t("coop.sale.crop"), sale.crop],
        [t("coop.order.bags"), t("coop.sale.bagsKg", { count: bags, kg })],
        [
          t("coop.sale.groupPrice"),
          t("coop.sale.perKg", { price: cedis(sale.price) }),
        ],
        [t("coop.sale.dropOff"), t("coop.sale.store")],
      ]}
      total={[t("coop.sale.youGet"), cedis(kg * sale.price)]}
      primary={{ to: COOP, label: t("coop.back") }}
    />
  )
}
