import {
  ArrowDown,
  Clock,
  HandCoins,
  Lock,
  ShieldCheck,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { SectionTitle } from "@/components/Blocks"
import { SampleBadge } from "@/components/Flow"
import { NoDataYet } from "@/features/farmer/DataStatus"
import { cedis } from "@/features/sample/data"
import { formatShortDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { useMoney, walletText } from "./wallet"

const actions: {
  to: string
  key: "buy" | "loan" | "insure" | "getPaid"
  icon: LucideIcon
}[] = [
  { to: "/farmer/money/buy", key: "buy", icon: ShoppingCart },
  { to: "/farmer/money/loan", key: "loan", icon: HandCoins },
  { to: "/farmer/money/insurance", key: "insure", icon: ShieldCheck },
  { to: "/farmer/money/get-paid", key: "getPaid", icon: ArrowDown },
]

/** P3 · 01 Money: the linked wallet (or a card to link one), the four money services and recent payments. */
export function MoneyHome() {
  const { t } = useTranslation()
  const money = useMoney()
  const wallet = money.data?.wallet

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl leading-9 font-semibold text-primary">
          {t("money.title")}
        </h1>
        {money.data?.sample ? <SampleBadge /> : null}
      </header>

      <Link
        to="/farmer/money/link"
        className="space-y-1 rounded-[24px] bg-primary p-5 text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <p className="text-sm opacity-90">
          {wallet
            ? t("money.linked")
            : money.data
              ? t("money.linkFirst")
              : t("money.title")}
        </p>
        <p className="text-xl font-semibold">
          {wallet
            ? walletText(wallet)
            : money.data
              ? t("money.linkFirstHint")
              : t("common.loading")}
        </p>
        <p className="flex items-center gap-1.5 text-sm opacity-90">
          <Lock aria-hidden className="size-4" />
          {t("money.pinSafe")}
        </p>
      </Link>

      <ul className="grid grid-cols-2 gap-4">
        {actions.map((a) => (
          <li key={a.key}>
            <Link
              to={a.to}
              className="flex h-full flex-col gap-4 rounded-[20px] border bg-card p-4 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {/* Figma P3 · 01: a green icon in a soft green circle, no picture */}
              <span
                aria-hidden
                className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary"
              >
                <a.icon className="size-5" />
              </span>
              <span>
                <span className="block text-base font-medium text-foreground">
                  {t(`money.actions.${a.key}`)}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {t(`money.actions.${a.key}Hint`)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="money-recent" className="space-y-3">
        <SectionTitle id="money-recent">{t("money.recent")}</SectionTitle>
        {!money.data ? (
          <NoDataYet state={money} />
        ) : money.data.payments.length === 0 ? (
          <p className="rounded-[20px] border border-dashed p-5 text-center text-muted-foreground">
            {t("money.noPayments")}
          </p>
        ) : (
          <ul className="space-y-3">
            {money.data.payments.map((p) => (
              <li
                key={p.reference}
                className="flex items-center gap-3 rounded-[20px] border bg-card p-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-medium text-foreground">
                    {p.description}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    {p.status === "paid" ? (
                      t("money.status.paid")
                    ) : p.status === "failed" ? (
                      t("money.status.failed")
                    ) : (
                      <>
                        <Clock aria-hidden className="size-3.5" />
                        {t("money.waitingNetwork")}
                      </>
                    )}{" "}
                    · {formatShortDate(p.createdAt)}
                  </span>
                </span>
                <span
                  className={cn(
                    "text-base font-semibold",
                    p.status === "failed"
                      ? "text-muted-foreground line-through"
                      : "text-warning"
                  )}
                >
                  − {cedis(p.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">
          {t("money.offlineNote")}
        </p>
      </section>
    </div>
  )
}
