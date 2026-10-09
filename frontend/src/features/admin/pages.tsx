import { Dialog } from "@base-ui/react/dialog"
import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
  KeyRound,
  MessageSquare,
  Phone,
  Play,
  Server,
  ShieldAlert,
  X,
} from "lucide-react"
import { useId, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { ChoiceChips } from "@/components/form/ChoiceChips"
import { FieldError } from "@/components/form/FieldError"
import { TextField } from "@/components/form/TextField"
import { LaterPhaseButton, SampleBadge } from "@/components/Flow"
import { Sheet } from "@/components/Sheet"
import { Button } from "@/components/ui/button"
import { cedis } from "@/features/sample/data"
import { toE164 } from "@/lib/phone"
import { listen } from "@/lib/speech"
import { fullName, ghanaPhone, required, type Problem } from "@/lib/validate"
import { cn } from "@/lib/utils"
import type { TFunction } from "i18next"
import { ApiError } from "@/api/client"
import {
  getHelpDesk,
  reassignHelpRequest,
  remindOfficer,
  voiceNoteUrl,
  type RequestItem,
} from "@/api/help"
import { NoDataYet } from "@/features/farmer/DataStatus"
import {
  getAdminCooperatives,
  remindPledges,
  type AdminCooperative,
} from "@/api/cooperative"
import { formatShortDate } from "@/lib/dates"
import { addPerson, type InviteOutcome } from "@/api/admin"
import { useServerData } from "@/features/farmer/useServerData"
import {
  agents,
  agentTotal,
  impact,
  regionReport,
  systemHealth,
  phoneReports,
  type Access,
  type Agent,
  type PhoneProblem,
  type PhoneReport,
  type ReportedVia,
} from "./sample"

type AdminOrder = AdminCooperative["orders"][number]

// The MoFA admin pages from Figma P4 · D2 to D6 (and D20 under Regions), on sample data until
// AdminService has an endpoint for each. Overview (AdminOverviewPage) is the live one.

function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle: string
  action?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl leading-9 font-semibold text-primary">
          {title}
        </h1>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {subtitle}
          <SampleBadge />
        </p>
      </div>
      {action}
    </header>
  )
}

/** The four numbers along the top: two green, two cream (Figma). */
function StatTiles({ tiles }: { tiles: readonly [string, string][] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map(([value, label], i) => (
        <li
          key={label}
          className={cn(
            "space-y-1 rounded-[20px] p-5",
            i < 2 ? "bg-secondary" : "bg-cream"
          )}
        >
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums",
              i < 2 ? "text-primary" : "text-foreground"
            )}
          >
            {value}
          </p>
          <p className="text-sm text-foreground">{label}</p>
        </li>
      ))}
    </ul>
  )
}

function Card({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className={cn("space-y-3 rounded-[20px] border bg-card p-5", className)}
    >
      <h2 id={id} className="text-base font-medium text-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}

type Tone = "green" | "amber" | "red" | "grey"
const toneClass: Record<Tone, string> = {
  green: "bg-secondary text-primary",
  amber: "bg-warning-soft text-warning",
  red: "bg-destructive-soft text-destructive",
  grey: "bg-muted text-muted-foreground",
}
const toneIcon: Record<Tone, typeof CheckCheck> = {
  green: CheckCheck,
  amber: Clock,
  red: AlertCircle,
  grey: X,
}

function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  const Icon = toneIcon[tone]
  return (
    <span
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium whitespace-nowrap",
        toneClass[tone]
      )}
    >
      <Icon aria-hidden className="size-4" />
      {children}
    </span>
  )
}

/** A label, a bar and the number (Figma "Farmers by district", "Good practices"). */
function BarRow({
  label,
  value,
  max,
  shown,
}: {
  label: string
  value: number
  max: number
  shown: string
}) {
  return (
    <li className="grid grid-cols-[minmax(0,12.5rem)_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
      <span className="truncate text-foreground">{label}</span>
      <span
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-4 overflow-hidden rounded-full bg-secondary"
      >
        <span
          className="block h-full rounded-full bg-primary"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </span>
      <span className="text-muted-foreground tabular-nums">{shown}</span>
    </li>
  )
}

/** Regions (Figma P1 · D20 MoFA Reports): totals only, no personal details. */
export function Regions() {
  const { t } = useTranslation()
  const r = regionReport
  const top = Math.max(...r.districts.map((d) => d.farmers))
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("adminPages.regions.title", { region: r.region })}
        subtitle={t("adminPages.regions.subtitle")}
      />
      <StatTiles
        tiles={[
          [
            r.registered.toLocaleString("en-GH"),
            t("adminPages.regions.registered"),
          ],
          [
            `${r.womenPercent}%`,
            t("adminPages.regions.women", { target: r.womenTarget }),
          ],
          [`${r.ussdPercent}%`, t("adminPages.regions.ussd")],
          [String(r.newThisWeek), t("adminPages.regions.newThisWeek")],
        ]}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,930fr)_minmax(0,420fr)]">
        <Card title={t("adminPages.regions.byDistrict")}>
          <ul className="space-y-3">
            {r.districts.map((d) => (
              <BarRow
                key={d.name}
                label={d.name}
                value={d.farmers}
                max={top}
                shown={String(d.farmers)}
              />
            ))}
          </ul>
        </Card>
        <Card title={t("adminPages.regions.byLanguage")}>
          <ul className="divide-y">
            {r.languages.map((l) => (
              <li
                key={l.name}
                className="flex items-center justify-between py-3"
              >
                <span>
                  <span className="block text-base text-foreground">
                    {l.name}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {t("adminPages.regions.channel", {
                      app: l.app,
                      ussd: 100 - l.app,
                    })}
                  </span>
                </span>
                <span className="text-xl text-primary tabular-nums">
                  {l.farmers}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("adminPages.regions.privacy")}
      </p>
    </div>
  )
}

const accessTone: Record<Access, Tone> = {
  active: "green",
  checkIn: "amber",
  phoneLost: "red",
  off: "grey",
}

/**
 * Agents and Access (Figma P4 · D2) with Add a person (D2b). A lost or stolen phone reaches this page
 * three ways: the agent reports it from another phone (Profile, "Report a lost or stolen phone"), calls
 * or texts the district office, or tells the admin in person; the admin then reports it here. Either
 * way the report is listed and access on that phone is turned off.
 */
export function Agents() {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState<{
    name: string
    invite: InviteOutcome
  } | null>(null)
  const [turnedOff, setTurnedOff] = useState<string[]>([])
  const [reports, setReports] = useState<PhoneReport[]>([...phoneReports])
  const [reporting, setReporting] = useState<Agent | null>(null)
  const reportFor = (id: string) => reports.find((r) => r.agentId === id)
  const access = (a: Agent): Access =>
    turnedOff.includes(a.id) ? "off" : reportFor(a.id) ? "phoneLost" : a.access

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("adminPages.agents.title")}
        subtitle={t("adminPages.agents.subtitle", {
          region: regionReport.region,
          count: agentTotal,
        })}
        action={
          <Button size="xl" className="px-8" onClick={() => setAdding(true)}>
            {t("adminPages.agents.add")}
          </Button>
        }
      />
      {added ? (
        <p
          role="status"
          className={cn(
            "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium",
            toneClass[added.invite === "sent" ? "green" : "amber"]
          )}
        >
          {added.invite === "sent" ? (
            <CheckCheck aria-hidden className="size-4 shrink-0" />
          ) : (
            <AlertCircle aria-hidden className="size-4 shrink-0" />
          )}
          {t(inviteText[added.invite], { name: added.name })}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-[20px] border bg-card">
        <table className="w-full min-w-220 text-left text-sm">
          <thead className="bg-secondary text-primary">
            <tr>
              {(
                [
                  "colAgent",
                  "colDistrict",
                  "colFarmers",
                  "colLastSync",
                  "colRole",
                  "colAccess",
                ] as const
              ).map((c) => (
                <th key={c} scope="col" className="px-5 py-3.5 font-medium">
                  {t(`adminPages.agents.${c}`)}
                </th>
              ))}
              <th scope="col" className="px-5 py-3.5">
                <span className="sr-only">
                  {t("adminPages.agents.colActions")}
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {agents.map((a) => (
              <tr key={a.id}>
                <th
                  scope="row"
                  className="px-5 py-4 text-base font-normal text-foreground"
                >
                  {a.name}
                </th>
                <td className="px-5 py-4 text-foreground">{a.district}</td>
                <td className="px-5 py-4 text-foreground tabular-nums">
                  {a.farmers ?? "—"}
                </td>
                <td className="px-5 py-4 text-foreground">{a.lastSync}</td>
                <td className="px-5 py-4 text-foreground">
                  {t(`adminPages.agents.role.${a.role}`)}
                </td>
                <td className="px-5 py-3">
                  <Pill tone={accessTone[access(a)]}>
                    {t(`adminPages.agents.access.${access(a)}`)}
                  </Pill>
                </td>
                <td className="px-5 py-3 text-right">
                  {reportFor(a.id) || turnedOff.includes(a.id) ? null : (
                    <Button
                      variant="ghost"
                      className="text-destructive"
                      aria-label={t("adminPages.agents.reportFor", {
                        name: a.name,
                      })}
                      onClick={() => setReporting(a)}
                    >
                      <ShieldAlert aria-hidden />
                      {t("adminPages.agents.report")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section
        aria-labelledby="phone-reports"
        className="space-y-4 rounded-[20px] border bg-card p-5"
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
          >
            <KeyRound className="size-5" />
          </span>
          <div className="min-w-0">
            <h2
              id="phone-reports"
              className="text-base font-medium text-foreground"
            >
              {t("adminPages.agents.lostTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("adminPages.agents.howReported")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("adminPages.agents.lostText")}
            </p>
          </div>
        </div>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("adminPages.agents.noReports")}
          </p>
        ) : (
          <ul className="divide-y border-t">
            {reports.map((r) => {
              const agent = agents.find((a) => a.id === r.agentId)!
              const off = turnedOff.includes(r.agentId)
              return (
                <li
                  key={r.agentId}
                  className="flex flex-wrap items-center gap-3 py-4"
                >
                  <span className="min-w-0 flex-1 basis-80">
                    <span className="block text-base text-foreground">
                      {t("adminPages.agents.reportLine", {
                        name: agent.name,
                        problem: t(`adminPages.agents.problem.${r.problem}`),
                      })}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {t("adminPages.agents.reportDetail", {
                        via: t(`adminPages.agents.via.${r.via}`),
                        when: r.when,
                        count: r.unsent,
                      })}
                    </span>
                  </span>
                  {off ? (
                    <Pill tone="grey">{t("adminPages.agents.access.off")}</Pill>
                  ) : (
                    <Button
                      size="xl"
                      variant="secondary"
                      className="px-7 text-primary"
                      onClick={() => setTurnedOff((ids) => [...ids, r.agentId])}
                    >
                      {t("adminPages.agents.turnOff", {
                        name: agent.name.split(" ")[0],
                      })}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <ReportPhone
        agent={reporting}
        onClose={() => setReporting(null)}
        onReport={(report, turnOff) => {
          setReports((list) => [...list, report])
          if (turnOff) setTurnedOff((ids) => [...ids, report.agentId])
          setReporting(null)
        }}
      />
      <AddPerson
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={(name, invite) => {
          setAdded({ name, invite })
          setAdding(false)
        }}
      />
    </div>
  )
}

/** The admin reports a phone for an agent who called, texted or came in. */
function ReportPhone({
  agent,
  onClose,
  onReport,
}: {
  agent: Agent | null
  onClose: () => void
  onReport: (report: PhoneReport, turnOff: boolean) => void
}) {
  const { t } = useTranslation()
  const [problem, setProblem] = useState<PhoneProblem>("lost")
  const [via, setVia] = useState<ReportedVia>("call")
  if (!agent) return null
  const report = (turnOff: boolean) =>
    onReport(
      {
        agentId: agent.id,
        problem,
        via,
        when: t("adminPages.agents.justNow"),
        unsent: 0,
      },
      turnOff
    )

  return (
    <Sheet
      open
      onClose={onClose}
      icon={<ShieldAlert aria-hidden />}
      tone="red"
      title={t("adminPages.agents.reportTitle", { name: agent.name })}
    >
      <p id="report-problem" className="text-sm font-medium text-foreground">
        {t("adminPages.agents.whatHappened")}
      </p>
      <ChoiceChips
        labelledBy="report-problem"
        options={(["lost", "stolen", "broken"] as const).map((p) => ({
          value: p,
          label: t(`lostPhone.reason.${p}`),
        }))}
        value={problem}
        onChange={(p) => setProblem(p)}
      />
      <p id="report-via" className="text-sm font-medium text-foreground">
        {t("adminPages.agents.howTold")}
      </p>
      <ChoiceChips
        labelledBy="report-via"
        options={(["call", "sms", "inPerson"] as const).map((v) => ({
          value: v,
          label: t(`adminPages.agents.viaChip.${v}`),
        }))}
        value={via}
        onChange={(v) => setVia(v)}
      />
      <Button
        size="xl"
        variant="destructive"
        className="w-full"
        onClick={() => report(true)}
      >
        {t("adminPages.agents.reportAndTurnOff")}
      </Button>
      <Button
        size="xl"
        variant="secondary"
        className="w-full text-primary"
        onClick={() => report(false)}
      >
        {t("adminPages.agents.reportOnly")}
      </Button>
    </Sheet>
  )
}

/** What the Agents page says once a person is added, by what happened to their SMS invite. */
const inviteText = {
  sent: "adminPages.agents.invited",
  logged: "adminPages.agents.invitedLogged",
  failed: "adminPages.agents.invitedFailed",
} as const satisfies Record<InviteOutcome, string>

/**
 * Figma P4 · D2b: the panel that slides in from the right. Sending makes the account (AdminService) and texts
 * the invite; the server says whether the SMS went.
 */
function AddPerson({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded: (name: string, invite: InviteOutcome) => void
}) {
  const { t } = useTranslation()
  const [role, setRole] = useState<"officer" | "admin">("officer")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [region, setRegion] = useState("Northern")
  const [district, setDistrict] = useState("")
  const [tried, setTried] = useState(false)
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  // A number the server said is taken, until it is changed.
  const [taken, setTaken] = useState<string | null>(null)
  // Each field's problem: a real name, a Ghana number not already in use, a region, and a district for officers.
  const problems: Record<string, Problem | "validate.taken" | null> = {
    "person-name": fullName(name),
    "person-phone":
      ghanaPhone(phone) ?? (toE164(phone) === taken ? "validate.taken" : null),
    "person-region": required(region),
    "person-district": role === "officer" ? required(district) : null,
  }
  const missing = Object.values(problems).some(Boolean)

  async function send() {
    setTried(true)
    setFailed(null)
    if (missing) return
    setSending(true)
    try {
      const result = await addPerson({
        role,
        fullName: name.trim(),
        phone,
        region: region.trim(),
        district: role === "officer" ? district.trim() : null,
      })
      onAdded(name.trim(), result.invite)
      setName("")
      setPhone("")
      setDistrict("")
      setTried(false)
    } catch (error) {
      if (error instanceof ApiError && error.key === "PHONE_TAKEN")
        setTaken(toE164(phone))
      else
        setFailed(
          error instanceof ApiError ? error.message : t("errors.generic")
        )
    } finally {
      setSending(false)
    }
  }

  const field = (
    id: string,
    label: string,
    value: string,
    set: (v: string) => void,
    extra: {
      inputMode?: "tel"
      autoComplete?: string
      placeholder?: string
    } = {}
  ) => {
    const problem = tried ? problems[id] : null
    return (
      <div className="space-y-2">
        <label htmlFor={id} className="block text-base text-foreground">
          {label}
        </label>
        <TextField
          id={id}
          value={value}
          onChange={(e) => set(e.target.value)}
          invalid={Boolean(problem)}
          aria-describedby={problem ? `${id}-error` : undefined}
          {...extra}
        />
        <FieldError
          id={`${id}-error`}
          message={problem ? t(problem) : undefined}
        />
      </div>
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/30" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full max-w-120 flex-col gap-4 overflow-y-auto bg-card p-8 outline-none">
          <Dialog.Title className="text-2xl font-medium text-foreground">
            {t("adminPages.person.title")}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            {t("adminPages.person.text")}
          </Dialog.Description>
          <div className="space-y-2">
            <p id="person-role" className="text-base text-foreground">
              {t("adminPages.person.role")}
            </p>
            <ChoiceChips
              labelledBy="person-role"
              options={[
                { value: "officer", label: t("who.officer") },
                { value: "admin", label: t("who.admin") },
              ]}
              value={role}
              onChange={(v) => setRole(v)}
            />
          </div>
          {field("person-name", t("adminPages.person.name"), name, setName, {
            autoComplete: "off",
          })}
          {field(
            "person-phone",
            t("adminPages.person.phone"),
            phone,
            setPhone,
            {
              inputMode: "tel",
              placeholder: "024 000 0000",
            }
          )}
          {field(
            "person-region",
            t("adminPages.person.region"),
            region,
            setRegion
          )}
          {role === "officer"
            ? field(
                "person-district",
                t("adminPages.person.district"),
                district,
                setDistrict
              )
            : null}
          <p className="rounded-2xl bg-secondary px-4 py-3 text-sm text-primary">
            {t("adminPages.person.note")}
          </p>
          {tried && missing ? (
            <p className="text-sm font-medium text-destructive">
              {t("validate.fix")}
            </p>
          ) : null}
          <FieldError id="person-error" message={failed ?? undefined} />
          <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
            <Button
              size="xl"
              variant="secondary"
              className="text-primary"
              onClick={onClose}
            >
              {t("adminPages.person.cancel")}
            </Button>
            <Button size="xl" disabled={sending} onClick={() => void send()}>
              {t("adminPages.person.send")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/**
 * Cooperatives (Figma P4 · D5, CooperativeService): the cooperatives run by officers in the admin's area.
 * Savings count once paid; orders, sale pledges and members are live.
 */
export function Cooperatives() {
  const { t } = useTranslation()
  const state = useServerData("admin-cooperatives", getAdminCooperatives)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [reminded, setReminded] = useState<Record<string, number>>({})
  const [failed, setFailed] = useState<string | null>(null)
  const all = state.data ?? []
  const picked = all.find((c) => c.cooperative.id === pickedId) ?? all[0]
  const orderTone: Record<AdminOrder["status"], Tone> = {
    open: "amber",
    closed: "grey",
    delivered: "green",
  }

  async function remind(id: string) {
    setFailed(null)
    try {
      const result = await remindPledges(id)
      setReminded((r) => ({ ...r, [id]: result.members }))
    } catch (error) {
      setFailed(error instanceof ApiError ? error.message : t("errors.generic"))
    }
  }

  if (!picked)
    return (
      <div className="space-y-6">
        <h1 className="text-2xl leading-9 font-semibold text-primary">
          {t("adminPages.coop.titleNone")}
        </h1>
        {state.data ? (
          <p className="rounded-[20px] border border-dashed p-6 text-center text-muted-foreground">
            {t("adminPages.coop.none")}
          </p>
        ) : (
          <NoDataYet state={state} />
        )}
      </div>
    )

  const c = picked.cooperative
  const sale = c.openSale
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl leading-9 font-semibold text-primary">
            {c.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("adminPages.coop.subtitleLive", {
              count: c.members.length,
              leader: c.leaderName,
              place: [c.community, c.district].filter(Boolean).join(", "),
            })}
          </p>
        </div>
        {all.length > 1 ? (
          <div
            role="group"
            aria-label={t("adminPages.coop.pick")}
            className="flex flex-wrap gap-2"
          >
            {all.map((x) => (
              <button
                key={x.cooperative.id}
                type="button"
                aria-pressed={x.cooperative.id === c.id}
                onClick={() => setPickedId(x.cooperative.id)}
                className={cn(
                  "h-10 rounded-full px-4 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  x.cooperative.id === c.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground"
                )}
              >
                {x.cooperative.name}
              </button>
            ))}
          </div>
        ) : null}
      </header>
      <StatTiles
        tiles={[
          [String(c.members.length), t("adminPages.coop.members")],
          [cedis(c.savings.group), t("adminPages.coop.saved")],
          [String(picked.orders.length), t("adminPages.coop.ordersAll")],
          [
            `${(picked.soldKg / 1000).toLocaleString("en-GH")} t`,
            t("adminPages.coop.soldAll"),
          ],
        ]}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,664fr)_minmax(0,440fr)]">
        <Card title={t("adminPages.coop.groupOrders")}>
          {picked.orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("adminPages.coop.noOrders")}
            </p>
          ) : (
            <ul className="divide-y border-t">
              {picked.orders.map((o) => (
                <li key={o.id} className="flex items-center gap-3 py-4">
                  <span className="min-w-0 flex-1">
                    <span className="block text-base text-foreground">
                      {t("adminPages.coop.orderLine", {
                        product: o.product,
                        bags: o.orderedBags,
                        target: o.targetBags,
                      })}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {t("adminPages.coop.orderDetail", {
                        count: o.members,
                        percent: Math.round(
                          ((o.alonePrice - o.unitPrice) / o.alonePrice) * 100
                        ),
                        closes: formatShortDate(`${o.closesOn}T12:00:00Z`),
                      })}
                    </span>
                  </span>
                  <Pill tone={orderTone[o.status]}>
                    {t(`adminPages.coop.status.${o.status}`)}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card
          title={t(
            sale ? "adminPages.coop.sellingCrop" : "adminPages.coop.selling",
            {
              crop: sale?.crop ?? "",
            }
          )}
        >
          {!sale ? (
            <p className="text-sm text-muted-foreground">
              {t("adminPages.coop.noSale")}
            </p>
          ) : (
            <>
              <p className="text-base text-foreground">
                {t("adminPages.coop.offer", {
                  buyer: sale.buyer,
                  price: cedis(sale.pricePerKg),
                  tonnes: (sale.targetKg / 1000).toLocaleString("en-GH"),
                  market: cedis(sale.marketPricePerKg),
                })}
              </p>
              <span
                role="meter"
                aria-label={t("adminPages.coop.selling")}
                aria-valuenow={sale.pledgedKg}
                aria-valuemin={0}
                aria-valuemax={sale.targetKg}
                className="block h-3.5 overflow-hidden rounded-full bg-secondary"
              >
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.min(100, (sale.pledgedKg / sale.targetKg) * 100)}%`,
                  }}
                />
              </span>
              <p className="text-sm text-muted-foreground">
                {t("adminPages.coop.pledged", {
                  pledged: (sale.pledgedKg / 1000).toLocaleString("en-GH"),
                  tonnes: (sale.targetKg / 1000).toLocaleString("en-GH"),
                  members: sale.pledgers,
                })}
              </p>
              <FieldError id="remind-error" message={failed ?? undefined} />
              {reminded[c.id] !== undefined ? (
                <p role="status" className="text-sm font-medium text-primary">
                  {t("adminPages.coop.remindedCount", {
                    count: reminded[c.id],
                  })}
                </p>
              ) : (
                <Button
                  size="xl"
                  variant="secondary"
                  className="w-full text-primary"
                  onClick={() => void remind(c.id)}
                >
                  {t("adminPages.coop.remind")}
                </Button>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

type DeskFilter = "waiting" | "overdue" | "answered"

const deskClock = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

/** "2 days", "5 hours", "20 minutes": how long a question has waited. */
function waited(iso: string, t: TFunction) {
  const minutes = Math.max(
    1,
    Math.round((Date.now() - Date.parse(iso)) / 60000)
  )
  if (minutes < 60) return t("adminPages.help.minutes", { count: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 48) return t("adminPages.help.hours", { count: hours })
  return t("adminPages.help.days", { count: Math.round(hours / 24) })
}

/**
 * Help desk (Figma P4 · D4, HelpService): every farmer's question in the admin's area, overdue ones first.
 * Advice comes from the farmer's officer; the admin reminds them, or gives the question to the officer
 * with the fewest open questions.
 */
export function HelpDesk() {
  const { t } = useTranslation()
  const state = useServerData("admin-help-desk", getHelpDesk)
  const [filter, setFilter] = useState<DeskFilter | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [changed, setChanged] = useState<Record<string, RequestItem>>({})
  const [done, setDone] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const desk = state.data
  const items = (desk?.requests ?? []).map((r) => changed[r.id] ?? r)
  const isOpen = (r: RequestItem) =>
    r.status === "waiting" || r.status === "still_needs_help"
  const shown = items.filter((r) =>
    filter === null
      ? true
      : filter === "overdue"
        ? r.overdue
        : filter === "waiting"
          ? isOpen(r)
          : !isOpen(r)
  )
  const open = items.find((r) => r.id === openId) ?? shown[0]
  const loads = desk?.officers ?? []
  const current = loads.find((o) => o.id === open?.officerId)
  const lightest = loads.find((o) => o.id !== open?.officerId)

  async function act(run: () => Promise<RequestItem>, note: string) {
    if (!open) return
    setBusy(true)
    setFailed(null)
    try {
      const item = await run()
      setChanged((c) => ({ ...c, [item.id]: item }))
      setDone((d) => ({ ...d, [item.id]: note }))
    } catch (error) {
      setFailed(error instanceof ApiError ? error.message : t("errors.generic"))
    } finally {
      setBusy(false)
    }
  }

  async function playVoice() {
    if (!open) return
    const url = await voiceNoteUrl(open.id)
    if (url) listen(t("requests.voiceOnly"), url)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl leading-9 font-semibold text-primary">
            {t("adminPages.help.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("adminPages.help.subtitle")}
          </p>
        </div>
        {desk ? (
          <div
            role="group"
            aria-label={t("adminPages.help.filter")}
            className="flex gap-2"
          >
            {(["waiting", "overdue", "answered"] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={filter === s}
                onClick={() => setFilter(filter === s ? null : s)}
                className={cn(
                  "h-12 rounded-full px-5 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  filter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground"
                )}
              >
                {t(`adminPages.help.count.${s}`, { count: desk[s] })}
              </button>
            ))}
          </div>
        ) : null}
      </header>
      {!desk ? (
        <NoDataYet state={state} />
      ) : items.length === 0 ? (
        <p className="rounded-[20px] border border-dashed p-6 text-center text-muted-foreground">
          {t("adminPages.help.none")}
        </p>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,640fr)_minmax(0,464fr)]">
          <ul className="divide-y rounded-[20px] border bg-card px-5 py-2">
            {shown.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(r.id)}
                  aria-current={r.id === open?.id ? "true" : undefined}
                  className="flex w-full items-center gap-3 py-3.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span
                    aria-hidden
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
                  >
                    {r.hasVoiceNote ? (
                      <Phone className="size-5" />
                    ) : (
                      <MessageSquare className="size-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-base text-foreground",
                        r.id === open?.id && "font-medium"
                      )}
                    >
                      {r.farmerName}:{" "}
                      {r.text ?? t(`help.category.${r.category}`)}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {r.officerName
                        ? t(
                            isOpen(r)
                              ? "adminPages.help.officerWaiting"
                              : "adminPages.help.officerAnswered",
                            {
                              officer: r.officerName.split(" ")[0],
                              waited: waited(r.createdAt, t),
                            }
                          )
                        : t("adminPages.help.noOfficer")}
                    </span>
                  </span>
                  <Pill
                    tone={!isOpen(r) ? "green" : r.overdue ? "red" : "amber"}
                  >
                    {t(
                      `adminPages.help.status.${!isOpen(r) ? "answered" : r.overdue ? "overdue" : "waiting"}`
                    )}
                  </Pill>
                </button>
              </li>
            ))}
          </ul>
          {open ? (
            <section className="space-y-4 rounded-[20px] border bg-card p-5">
              <h2 className="text-xl font-medium text-foreground">
                {t("adminPages.help.waited", {
                  farmer: open.farmerName,
                  waited: waited(open.createdAt, t),
                })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {[
                  open.community,
                  open.officerName
                    ? t("adminPages.help.assignedTo", {
                        officer: open.officerName,
                      })
                    : t("adminPages.help.unassignedShort"),
                  t(`help.category.${open.category}`),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {open.text ? (
                <p className="text-base text-foreground">{open.text}</p>
              ) : null}
              {open.hasVoiceNote ? (
                <Button
                  size="xl"
                  variant="secondary"
                  className="gap-3 self-start pl-2 text-primary"
                  onClick={() => void playVoice()}
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Play aria-hidden className="size-5" />
                  </span>
                  {t("adminPages.help.play", {
                    farmer: open.farmerName.split(" ")[0],
                    length: deskClock(open.voiceSeconds ?? 0),
                  })}
                </Button>
              ) : null}
              {open.answer ? (
                <p className="rounded-2xl bg-secondary px-4 py-3 text-sm text-primary">
                  {t("adminPages.help.answer", { answer: open.answer })}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("adminPages.help.adviceFrom")}
                </p>
              )}
              <FieldError id="desk-error" message={failed ?? undefined} />
              {done[open.id] ? (
                <p
                  role="status"
                  className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm font-medium text-primary"
                >
                  <Check aria-hidden className="size-4" />
                  {done[open.id]}
                </p>
              ) : isOpen(open) ? (
                <>
                  {lightest ? (
                    <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-foreground">
                      {current
                        ? t("adminPages.help.suggest", {
                            officer: current.fullName.split(" ")[0],
                            open: current.open,
                            other: lightest.fullName.split(" ")[0],
                            district: lightest.district ?? "",
                            otherOpen: lightest.open,
                          })
                        : t("adminPages.help.suggestNoOfficer", {
                            other: lightest.fullName.split(" ")[0],
                            otherOpen: lightest.open,
                          })}
                    </p>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {lightest ? (
                      <Button
                        size="xl"
                        variant="secondary"
                        className="text-primary"
                        disabled={busy}
                        onClick={() =>
                          void act(
                            () => reassignHelpRequest(open.id, lightest.id),
                            t("adminPages.help.reassigned", {
                              officer: lightest.fullName.split(" ")[0],
                            })
                          )
                        }
                      >
                        {t("adminPages.help.reassign", {
                          officer: lightest.fullName.split(" ")[0],
                        })}
                      </Button>
                    ) : null}
                    {open.officerName ? (
                      <Button
                        size="xl"
                        disabled={busy}
                        onClick={() =>
                          void act(
                            () => remindOfficer(open.id),
                            t("adminPages.help.remindedOfficer", {
                              officer: open.officerName!.split(" ")[0],
                            })
                          )
                        }
                      >
                        {t("adminPages.help.remind", {
                          officer: open.officerName.split(" ")[0],
                        })}
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}

/** Impact and SDG report (Figma P4 · D6). */
export function Impact() {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("adminPages.impact.title")}
        subtitle={t("adminPages.impact.subtitle", { season: impact.season })}
        action={
          <LaterPhaseButton className="px-8">
            {t("adminPages.impact.download")}
          </LaterPhaseButton>
        }
      />
      <StatTiles
        tiles={impact.tiles.map((x) => [x.value, x.label] as [string, string])}
      />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card title={t("adminPages.impact.practices")}>
          <ul className="space-y-3">
            {impact.practices.map((p) => (
              <BarRow
                key={p.name}
                label={p.name}
                value={p.percent}
                max={100}
                shown={`${p.percent}%`}
              />
            ))}
          </ul>
        </Card>
        <Card title={t("adminPages.impact.handover")}>
          <ul className="space-y-3">
            {impact.handover.map((h) => (
              <li key={h.name} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    "flex size-6.5 shrink-0 items-center justify-center rounded-full",
                    h.done
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Check aria-hidden className="size-3.5" />
                  <span className="sr-only">
                    {t(
                      h.done
                        ? "adminPages.impact.done"
                        : "adminPages.impact.notYet"
                    )}
                  </span>
                </span>
                <span
                  className={
                    h.done ? "text-foreground" : "text-muted-foreground"
                  }
                >
                  {h.name}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

/** System health (Figma P4 · D3). */
export function System() {
  const { t } = useTranslation()
  const s = systemHealth
  const allOk = s.services.every((x) => x.ok)
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("adminPages.system.title")}
        subtitle={s.environment}
        action={
          <Pill tone={allOk ? "green" : "amber"}>
            {t(
              allOk ? "adminPages.system.allOk" : "adminPages.system.someSlow"
            )}
          </Pill>
        }
      />
      <StatTiles
        tiles={[
          [
            `${s.uptime}%`,
            t("adminPages.system.uptime", { target: s.uptimeTarget }),
          ],
          [`${s.p95Ms} ms`, t("adminPages.system.p95")],
          [
            s.waitingOnPhones.toLocaleString("en-GH"),
            t("adminPages.system.waiting"),
          ],
          [String(s.failedDeploys), t("adminPages.system.failed")],
        ]}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,644fr)_minmax(0,460fr)]">
        <Card title={t("adminPages.system.services")}>
          <ul className="divide-y border-t">
            {s.services.map((x) => (
              <li key={x.name} className="flex items-center gap-3 py-4">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
                >
                  <Server className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base text-foreground">
                    {x.name}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {x.detail}
                  </span>
                </span>
                <Pill tone={x.ok ? "green" : "amber"}>
                  {t(
                    x.ok
                      ? "adminPages.system.healthy"
                      : "adminPages.system.slow"
                  )}
                </Pill>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t("adminPages.system.alerts")}>
          <ul className="divide-y border-t">
            {s.alerts.map((a) => (
              <li key={a.title} className="flex items-center gap-3 py-4">
                <span
                  aria-hidden
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    a.open
                      ? "bg-warning-soft text-warning"
                      : "bg-secondary text-primary"
                  )}
                >
                  {a.open ? (
                    <AlertCircle className="size-4.5" />
                  ) : (
                    <Check className="size-4.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base text-foreground">
                    {a.title}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {a.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
