import { Clock, Lock } from "lucide-react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { SectionTitle } from "@/components/Blocks"
import { SampleBadge } from "@/components/Flow"
import { Picture, type PictureSource } from "@/components/Picture"
import { cedis, transactions, wallet } from "@/features/sample/data"
import { cn } from "@/lib/utils"

const actions: {
  to: string
  key: "buy" | "loan" | "insure" | "getPaid"
  picture: PictureSource
}[] = [
  {
    to: "/farmer/money/buy",
    key: "buy",
    picture: { photo: "options/fertiliser", emoji: "bucket" },
  },
  {
    to: "/farmer/money/loan",
    key: "loan",
    picture: { photo: "options/cedi", emoji: "money-bag" },
  },
  {
    to: "/farmer/money/insurance",
    key: "insure",
    picture: { photo: "options/umbrella", emoji: "sun-behind-rain-cloud" },
  },
  {
    to: "/farmer/money/get-paid",
    key: "getPaid",
    picture: { photo: "options/coins", emoji: "chart-increasing" },
  },
]

/** P3 · 01 Money: the linked wallet, the four money services and recent payments. */
export function MoneyHome() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl leading-9 font-semibold text-primary">
          {t("money.title")}
        </h1>
        <SampleBadge />
      </header>

      <Link
        to="/farmer/money/link"
        className="space-y-1 rounded-[24px] bg-primary p-5 text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <p className="text-sm opacity-90">{t("money.linked")}</p>
        <p className="text-xl font-semibold">
          {wallet.provider} · {wallet.number}
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
              className="flex h-full flex-col gap-3 rounded-[20px] border bg-card p-4 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Picture
                source={a.picture}
                fit="contain"
                className="h-20 w-full rounded-2xl bg-cream p-2"
                emojiClassName="mx-auto h-20 w-14"
              />
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
        <ul className="space-y-3">
          {transactions.map((tx) => (
            <li
              key={tx.id}
              className="flex items-center gap-3 rounded-[20px] border bg-card p-4"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-base font-medium text-foreground">
                  {tx.who}
                </span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  {tx.note === "waiting" ? (
                    <>
                      <Clock aria-hidden className="size-3.5" />
                      {t("money.waitingNetwork")}
                    </>
                  ) : (
                    tx.note
                  )}{" "}
                  · {tx.when}
                </span>
              </span>
              <span
                className={cn(
                  "text-base font-semibold",
                  tx.amount > 0 ? "text-primary" : "text-warning"
                )}
              >
                {tx.amount > 0 ? "+ " : "− "}
                {cedis(Math.abs(tx.amount))}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          {t("money.offlineNote")}
        </p>
      </section>
    </div>
  )
}
