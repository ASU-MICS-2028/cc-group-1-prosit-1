import { ShieldAlert } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ChoiceChips } from "@/components/form/ChoiceChips"
import { Sheet } from "@/components/Sheet"
import { Button } from "@/components/ui/button"

export type LostReason = "lost" | "stolen" | "broken"

/**
 * An officer reports their old phone (Profile, signed in on another phone). The MoFA admin sees the
 * report in Agents and turns that phone's access off; farmers saved on it but not sent are listed for
 * a re-visit. Officers with no phone at all call their district office, and the admin reports it for
 * them. Sample until AuthService can end the old phone's sign-in (the report is shown, not sent).
 */
export function LostPhoneSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [reason, setReason] = useState<LostReason>("lost")
  const [sent, setSent] = useState(false)

  return (
    <Sheet
      open={open}
      onClose={() => {
        onClose()
        setSent(false)
      }}
      icon={<ShieldAlert aria-hidden />}
      tone="red"
      title={t("lostPhone.title")}
    >
      {sent ? (
        <>
          <p role="status" className="text-center text-base text-foreground">
            {t("lostPhone.sent")}
          </p>
          <p className="text-center text-sm text-muted-foreground">
            {t("lostPhone.sample")}
          </p>
          <Button size="xl" className="w-full" onClick={onClose}>
            {t("lostPhone.done")}
          </Button>
        </>
      ) : (
        <>
          <p className="text-center text-base text-muted-foreground">
            {t("lostPhone.text")}
          </p>
          <p id="lost-reason" className="text-sm font-medium text-foreground">
            {t("lostPhone.what")}
          </p>
          <ChoiceChips
            labelledBy="lost-reason"
            options={(["lost", "stolen", "broken"] as const).map((r) => ({
              value: r,
              label: t(`lostPhone.reason.${r}`),
            }))}
            value={reason}
            onChange={(r) => setReason(r)}
          />
          <p className="text-sm text-muted-foreground">
            {t("lostPhone.noPhone")}
          </p>
          <Button
            size="xl"
            variant="destructive"
            className="w-full"
            onClick={() => setSent(true)}
          >
            {t("lostPhone.report")}
          </Button>
          <Button
            size="xl"
            variant="secondary"
            className="w-full text-primary"
            onClick={onClose}
          >
            {t("lostPhone.cancel")}
          </Button>
        </>
      )}
    </Sheet>
  )
}
