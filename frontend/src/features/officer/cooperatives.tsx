import {
  CalendarDays,
  Plus,
  ShoppingCart,
  UserPlus,
  Users,
  Wheat,
} from "lucide-react"
import { useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { ApiError } from "@/api/client"
import {
  addCooperativeMember,
  createCooperative,
  createMeeting,
  createOrder,
  createSale,
  getOfficerCooperatives,
  type CooperativeDetails,
} from "@/api/cooperative"
import { BackHeader } from "@/components/Blocks"
import { FieldError } from "@/components/form/FieldError"
import { TextField } from "@/components/form/TextField"
import { Button } from "@/components/ui/button"
import { NoDataYet } from "@/features/farmer/DataStatus"
import { useServerData } from "@/features/farmer/useServerData"
import { useFarmers } from "@/features/farmers/farmers"
import { formatLongDate } from "@/lib/dates"
import { useIsDesktop } from "@/lib/useIsDesktop"
import { required, type Problem } from "@/lib/validate"
import { cn } from "@/lib/utils"

type Form = "order" | "sale" | "meeting" | "member"

const cedis = (n: number) =>
  `GH₵ ${n.toLocaleString("en-GH", { maximumFractionDigits: 2 })}`

/** A positive amount in cedis ("150", "6.80"). */
function money(value: string): Problem | "validate.positive" | null {
  if (value.trim() === "") return "validate.required"
  return /^\d+(\.\d{1,2})?$/.test(value.trim()) && Number(value) > 0
    ? null
    : "validate.positive"
}

function wholeNumber(value: string): Problem | "validate.positive" | null {
  if (value.trim() === "") return "validate.required"
  return /^\d+$/.test(value.trim()) && Number(value) > 0
    ? null
    : "validate.positive"
}

/** A date (and time) that has not passed. */
function future(value: string): Problem | "validate.future" | null {
  if (value.trim() === "") return "validate.required"
  return Date.parse(value) > Date.now() ? null : "validate.future"
}

/**
 * The officer's cooperatives (CooperativeService, ADR 0037): start one with a farmer as leader, add the
 * officer's own farmers, and open a group order, a sale together or a meeting. No Figma frame yet: built
 * from the flow components; to be drawn by the design team.
 */
export function OfficerCooperatives() {
  const { t } = useTranslation()
  const desktop = useIsDesktop()
  const state = useServerData("officer-cooperatives", getOfficerCooperatives)
  const [starting, setStarting] = useState(false)
  const list = state.data ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <BackHeader
        title={t("officerCoop.title")}
        subtitle={t("officerCoop.subtitle")}
        to={desktop ? false : "/"}
        tone="green"
        action={
          <Button
            size="xl"
            className="px-5"
            onClick={() => setStarting(!starting)}
          >
            <Plus aria-hidden />
            {t("officerCoop.start")}
          </Button>
        }
      />
      {starting ? (
        <StartForm
          onDone={() => {
            setStarting(false)
            state.reload()
          }}
        />
      ) : null}
      {!state.data ? (
        <NoDataYet state={state} />
      ) : list.length === 0 && !starting ? (
        <p className="rounded-[20px] border border-dashed p-6 text-center text-muted-foreground">
          {t("officerCoop.none")}
        </p>
      ) : (
        list.map((c) => (
          <CooperativeCard key={c.id} coop={c} onChanged={state.reload} />
        ))
      )}
    </div>
  )
}

/** The officer's synced farmers who are not in a cooperative yet (the server only knows synced ones). */
function useFreeFarmers(taken: string[]) {
  return useFarmers().filter(
    (f) => f.status === "synced" && !taken.includes(f.id)
  )
}

function Field({
  id,
  label,
  problem,
  children,
}: {
  id: string
  label: string
  problem?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      <FieldError id={`${id}-error`} message={problem} />
    </div>
  )
}

function FarmerSelect({
  id,
  value,
  onChange,
  farmers,
  invalid,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  farmers: { id: string; name: string; village: string }[]
  invalid: boolean
}) {
  const { t } = useTranslation()
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-14 w-full rounded-[30px] border-2 bg-card px-5 text-base text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        invalid ? "border-destructive" : "border-primary"
      )}
    >
      <option value="">{t("officerCoop.chooseFarmer")}</option>
      {farmers.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
          {f.village ? ` · ${f.village}` : ""}
        </option>
      ))}
    </select>
  )
}

function useSave() {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  async function save(run: () => Promise<unknown>, done: () => void) {
    setBusy(true)
    setFailed(null)
    try {
      await run()
      done()
    } catch (error) {
      setFailed(error instanceof ApiError ? error.message : t("errors.generic"))
    } finally {
      setBusy(false)
    }
  }
  return { busy, failed, save }
}

function StartForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState("")
  const [community, setCommunity] = useState("")
  const [leader, setLeader] = useState("")
  const [tried, setTried] = useState(false)
  const farmers = useFreeFarmers([])
  const { busy, failed, save } = useSave()
  const problems = {
    name: required(name),
    community: required(community),
    leader: leader ? null : ("validate.required" as const),
  }
  const show = (k: keyof typeof problems) =>
    tried && problems[k] ? t(problems[k]) : undefined

  return (
    <section className="space-y-4 rounded-[20px] border bg-card p-5">
      <h2 className="text-lg font-medium text-foreground">
        {t("officerCoop.startTitle")}
      </h2>
      <Field
        id="coop-name"
        label={t("officerCoop.name")}
        problem={show("name")}
      >
        <TextField
          id="coop-name"
          value={name}
          maxLength={150}
          invalid={!!show("name")}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field
        id="coop-community"
        label={t("officerCoop.community")}
        problem={show("community")}
      >
        <TextField
          id="coop-community"
          value={community}
          maxLength={100}
          invalid={!!show("community")}
          onChange={(e) => setCommunity(e.target.value)}
        />
      </Field>
      <Field
        id="coop-leader"
        label={t("officerCoop.leader")}
        problem={show("leader")}
      >
        <FarmerSelect
          id="coop-leader"
          value={leader}
          onChange={setLeader}
          farmers={farmers}
          invalid={!!show("leader")}
        />
      </Field>
      {farmers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("officerCoop.syncFirst")}
        </p>
      ) : null}
      <FieldError id="coop-start-error" message={failed ?? undefined} />
      <Button
        size="xl"
        className="w-full"
        disabled={busy}
        onClick={() => {
          setTried(true)
          if (Object.values(problems).some(Boolean)) return
          void save(
            () =>
              createCooperative({
                name: name.trim(),
                community: community.trim(),
                leaderFarmerId: leader,
              }),
            onDone
          )
        }}
      >
        {t("officerCoop.create")}
      </Button>
    </section>
  )
}

function CooperativeCard({
  coop,
  onChanged,
}: {
  coop: CooperativeDetails
  onChanged: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<Form | null>(null)
  const done = () => {
    setOpen(null)
    onChanged()
  }
  const forms: { key: Form; icon: typeof Users; label: string }[] = [
    { key: "member", icon: UserPlus, label: t("officerCoop.addMember") },
    { key: "order", icon: ShoppingCart, label: t("officerCoop.newOrder") },
    { key: "sale", icon: Wheat, label: t("officerCoop.newSale") },
    { key: "meeting", icon: CalendarDays, label: t("officerCoop.newMeeting") },
  ]

  return (
    <section
      aria-labelledby={`coop-${coop.id}`}
      className="space-y-4 rounded-[20px] border bg-card p-5"
    >
      <div>
        <h2
          id={`coop-${coop.id}`}
          className="text-lg font-medium text-foreground"
        >
          {coop.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("officerCoop.line", {
            count: coop.members.length,
            leader: coop.leaderName,
            community: coop.community,
          })}
        </p>
      </div>
      <ul className="grid gap-2 text-sm text-foreground sm:grid-cols-2">
        <li className="rounded-2xl bg-secondary px-4 py-3">
          {t("officerCoop.saved", { amount: cedis(coop.savings.group) })}
        </li>
        <li className="rounded-2xl bg-secondary px-4 py-3">
          {coop.openOrder
            ? t("officerCoop.orderOpen", {
                product: coop.openOrder.product,
                bags: coop.openOrder.orderedBags,
                target: coop.openOrder.targetBags,
              })
            : t("officerCoop.noOrder")}
        </li>
        <li className="rounded-2xl bg-cream px-4 py-3">
          {coop.openSale
            ? t("officerCoop.saleOpen", {
                crop: coop.openSale.crop,
                kg: coop.openSale.pledgedKg,
                target: coop.openSale.targetKg,
              })
            : t("officerCoop.noSale")}
        </li>
        <li className="rounded-2xl bg-cream px-4 py-3">
          {coop.nextMeeting
            ? t("officerCoop.meetingNext", {
                when: formatLongDate(coop.nextMeeting.startsAt),
                coming: coop.nextMeeting.comingCount,
              })
            : t("officerCoop.noMeeting")}
        </li>
      </ul>
      <details className="text-sm">
        <summary className="cursor-pointer font-medium text-primary">
          {t("officerCoop.members", { count: coop.members.length })}
        </summary>
        <ul className="mt-2 space-y-1 text-foreground">
          {coop.members.map((m) => (
            <li key={m.farmerId}>
              {m.fullName}
              {m.isLeader ? ` · ${t("officerCoop.leaderTag")}` : ""}
            </li>
          ))}
        </ul>
      </details>
      <div className="flex flex-wrap gap-2">
        {forms.map((f) => (
          <Button
            key={f.key}
            variant={open === f.key ? "default" : "secondary"}
            className={cn(
              "h-11 rounded-full px-4",
              open !== f.key && "text-primary"
            )}
            aria-expanded={open === f.key}
            onClick={() => setOpen(open === f.key ? null : f.key)}
          >
            <f.icon aria-hidden />
            {f.label}
          </Button>
        ))}
      </div>
      {open === "member" ? <MemberForm coop={coop} onDone={done} /> : null}
      {open === "order" ? <OrderForm coop={coop} onDone={done} /> : null}
      {open === "sale" ? <SaleForm coop={coop} onDone={done} /> : null}
      {open === "meeting" ? <MeetingForm coop={coop} onDone={done} /> : null}
    </section>
  )
}

function MemberForm({
  coop,
  onDone,
}: {
  coop: CooperativeDetails
  onDone: () => void
}) {
  const { t } = useTranslation()
  const farmers = useFreeFarmers(coop.members.map((m) => m.farmerId))
  const [farmer, setFarmer] = useState("")
  const [tried, setTried] = useState(false)
  const { busy, failed, save } = useSave()
  const problem = tried && !farmer ? t("validate.required") : undefined
  const id = `member-${coop.id}`
  return (
    <div className="space-y-3 border-t pt-4">
      <Field id={id} label={t("officerCoop.whichFarmer")} problem={problem}>
        <FarmerSelect
          id={id}
          value={farmer}
          onChange={setFarmer}
          farmers={farmers}
          invalid={!!problem}
        />
      </Field>
      <FieldError id={`${id}-save`} message={failed ?? undefined} />
      <Button
        size="xl"
        className="w-full"
        disabled={busy}
        onClick={() => {
          setTried(true)
          if (farmer)
            void save(() => addCooperativeMember(coop.id, farmer), onDone)
        }}
      >
        {t("officerCoop.add")}
      </Button>
    </div>
  )
}

function OrderForm({
  coop,
  onDone,
}: {
  coop: CooperativeDetails
  onDone: () => void
}) {
  const { t } = useTranslation()
  const [v, setV] = useState({
    product: "",
    dealer: "",
    unit: "",
    alone: "",
    target: "",
    closes: "",
  })
  const [tried, setTried] = useState(false)
  const { busy, failed, save } = useSave()
  const problems: Record<keyof typeof v, string | null> = {
    product: required(v.product),
    dealer: required(v.dealer),
    unit: money(v.unit),
    alone:
      money(v.alone) ??
      (Number(v.alone) < Number(v.unit) ? "validate.aloneHigher" : null),
    target: wholeNumber(v.target),
    closes:
      v.closes === "" ? "validate.required" : future(`${v.closes}T23:59:00`),
  }
  const field = (
    k: keyof typeof v,
    type: "text" | "date" = "text",
    inputMode?: "decimal" | "numeric"
  ) => {
    const id = `order-${k}-${coop.id}`
    const problem =
      tried && problems[k] ? t(problems[k] as "validate.required") : undefined
    return (
      <Field id={id} label={t(`officerCoop.order.${k}`)} problem={problem}>
        <TextField
          id={id}
          type={type}
          inputMode={inputMode}
          value={v[k]}
          invalid={!!problem}
          onChange={(e) => setV({ ...v, [k]: e.target.value })}
        />
      </Field>
    )
  }
  return (
    <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
      {field("product")}
      {field("dealer")}
      {field("unit", "text", "decimal")}
      {field("alone", "text", "decimal")}
      {field("target", "text", "numeric")}
      {field("closes", "date")}
      <div className="space-y-2 sm:col-span-2">
        <FieldError
          id={`order-save-${coop.id}`}
          message={failed ?? undefined}
        />
        <Button
          size="xl"
          className="w-full"
          disabled={busy}
          onClick={() => {
            setTried(true)
            if (Object.values(problems).some(Boolean)) return
            void save(
              () =>
                createOrder(coop.id, {
                  product: v.product.trim(),
                  dealer: v.dealer.trim(),
                  unitPrice: Number(v.unit),
                  alonePrice: Number(v.alone),
                  targetBags: Number(v.target),
                  closesOn: v.closes,
                }),
              onDone
            )
          }}
        >
          {t("officerCoop.openOrder")}
        </Button>
      </div>
    </div>
  )
}

function SaleForm({
  coop,
  onDone,
}: {
  coop: CooperativeDetails
  onDone: () => void
}) {
  const { t } = useTranslation()
  const [v, setV] = useState({
    crop: "",
    buyer: "",
    price: "",
    market: "",
    target: "",
  })
  const [tried, setTried] = useState(false)
  const { busy, failed, save } = useSave()
  const problems: Record<keyof typeof v, string | null> = {
    crop: required(v.crop),
    buyer: required(v.buyer),
    price: money(v.price),
    market: money(v.market),
    target: wholeNumber(v.target),
  }
  const field = (k: keyof typeof v, inputMode?: "decimal" | "numeric") => {
    const id = `sale-${k}-${coop.id}`
    const problem =
      tried && problems[k] ? t(problems[k] as "validate.required") : undefined
    return (
      <Field id={id} label={t(`officerCoop.sale.${k}`)} problem={problem}>
        <TextField
          id={id}
          inputMode={inputMode}
          value={v[k]}
          invalid={!!problem}
          onChange={(e) => setV({ ...v, [k]: e.target.value })}
        />
      </Field>
    )
  }
  return (
    <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
      {field("crop")}
      {field("buyer")}
      {field("price", "decimal")}
      {field("market", "decimal")}
      {field("target", "numeric")}
      <div className="space-y-2 sm:col-span-2">
        <FieldError id={`sale-save-${coop.id}`} message={failed ?? undefined} />
        <Button
          size="xl"
          className="w-full"
          disabled={busy}
          onClick={() => {
            setTried(true)
            if (Object.values(problems).some(Boolean)) return
            void save(
              () =>
                createSale(coop.id, {
                  crop: v.crop.trim(),
                  buyer: v.buyer.trim(),
                  pricePerKg: Number(v.price),
                  marketPricePerKg: Number(v.market),
                  targetKg: Number(v.target),
                }),
              onDone
            )
          }}
        >
          {t("officerCoop.openSale")}
        </Button>
      </div>
    </div>
  )
}

function MeetingForm({
  coop,
  onDone,
}: {
  coop: CooperativeDetails
  onDone: () => void
}) {
  const { t } = useTranslation()
  const [v, setV] = useState({ startsAt: "", place: "", topic: "", bring: "" })
  const [tried, setTried] = useState(false)
  const { busy, failed, save } = useSave()
  const problems: Record<keyof typeof v, string | null> = {
    startsAt: future(v.startsAt),
    place: required(v.place),
    topic: required(v.topic),
    bring: null,
  }
  const field = (
    k: keyof typeof v,
    type: "text" | "datetime-local" = "text"
  ) => {
    const id = `meeting-${k}-${coop.id}`
    const problem =
      tried && problems[k] ? t(problems[k] as "validate.required") : undefined
    return (
      <Field id={id} label={t(`officerCoop.meeting.${k}`)} problem={problem}>
        <TextField
          id={id}
          type={type}
          value={v[k]}
          invalid={!!problem}
          onChange={(e) => setV({ ...v, [k]: e.target.value })}
        />
      </Field>
    )
  }
  return (
    <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
      {field("startsAt", "datetime-local")}
      {field("place")}
      {field("topic")}
      {field("bring")}
      <div className="space-y-2 sm:col-span-2">
        <FieldError
          id={`meeting-save-${coop.id}`}
          message={failed ?? undefined}
        />
        <Button
          size="xl"
          className="w-full"
          disabled={busy}
          onClick={() => {
            setTried(true)
            if (Object.values(problems).some(Boolean)) return
            void save(
              () =>
                createMeeting(coop.id, {
                  startsAt: new Date(v.startsAt).toISOString(),
                  place: v.place.trim(),
                  topic: v.topic.trim(),
                  bring: v.bring.trim() || null,
                }),
              onDone
            )
          }}
        >
          {t("officerCoop.planMeeting")}
        </Button>
      </div>
    </div>
  )
}
