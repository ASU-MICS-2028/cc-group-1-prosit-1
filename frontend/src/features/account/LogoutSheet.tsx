import { LogOut } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { clearSession } from "@/auth/session"
import { Sheet } from "@/components/Sheet"
import { Button } from "@/components/ui/button"
import { syncNow } from "@/features/sync/sync"

/**
 * Log out? (Figma 25). With farmers still waiting, the first choice sends them before signing out,
 * so nothing is left behind unsent. Saved records stay on the device either way (ADR 0005).
 */
export function LogoutSheet({
  open,
  onClose,
  waiting,
}: {
  open: boolean
  onClose: () => void
  waiting: number
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  function logOut() {
    clearSession()
    void navigate("/who", { replace: true })
  }

  async function syncThenLogOut() {
    setBusy(true)
    setFailed(false)
    try {
      await syncNow()
      logOut()
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      icon={<LogOut />}
      tone="red"
      title={t("profile.logOutTitle")}
    >
      {waiting > 0 ? (
        <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
          {failed
            ? t("profile.syncFailed")
            : t("profile.notSentWarning", { count: waiting })}
        </p>
      ) : null}
      {waiting > 0 && !failed ? (
        <Button size="xl" onClick={() => void syncThenLogOut()} disabled={busy}>
          {busy ? t("sync.sending") : t("profile.syncThenLogOut")}
        </Button>
      ) : (
        <Button
          size="xl"
          variant={waiting > 0 ? "destructive" : "default"}
          onClick={logOut}
        >
          {waiting > 0 ? t("profile.logOutAnyway") : t("common.logOut")}
        </Button>
      )}
      <Button
        size="xl"
        variant="secondary"
        className="text-primary"
        onClick={onClose}
      >
        {t("profile.stayLoggedIn")}
      </Button>
    </Sheet>
  )
}
