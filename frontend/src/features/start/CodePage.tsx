import { useEffect, useState, type FormEvent } from "react"
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom"
import { useTranslation } from "react-i18next"
import { requestCode, verifyCode } from "@/api/auth"
import { ApiError } from "@/api/client"
import { BackButton } from "@/components/BackButton"
import { CodeInput } from "@/components/CodeInput"
import { IllustrationCard } from "@/components/IllustrationCard"
import { QuestionTitle } from "@/components/QuestionTitle"
import { ScreenShell } from "@/components/ScreenShell"
import { Button } from "@/components/ui/button"
import { homeFor, saveSession } from "@/auth/session"
import { maskPhone } from "@/lib/phone"
import { formatCountdown, roleFrom, type CodeScreenState } from "./login"

/** 02b / 02d Enter code: the 6 digits from the SMS sign the person in. */
export function Component() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const role = roleFrom(useParams().role)
  const state = useLocation().state as CodeScreenState | null
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [waitLeft, setWaitLeft] = useState(state?.resendAfterSeconds ?? 0)

  useEffect(() => {
    if (waitLeft <= 0) return
    const timer = setTimeout(() => setWaitLeft((left) => left - 1), 1000)
    return () => clearTimeout(timer)
  }, [waitLeft])

  // Opened directly (no number from the previous screen): start again.
  if (!state?.phone) return <Navigate to={`/login/${role}`} replace />
  const phone = state.phone

  async function verify(event: FormEvent) {
    event.preventDefault()
    if (code.length !== 6) {
      setError(t("login.codeIncomplete"))
      return
    }
    setError(null)
    setBusy(true)
    try {
      const signedIn = await verifyCode(phone, role, code)
      saveSession(signedIn)
      void navigate(homeFor(signedIn.user.role), { replace: true })
    } catch (failure) {
      setError(
        failure instanceof ApiError ? failure.message : t("errors.generic")
      )
      setBusy(false)
    }
  }

  async function resend() {
    setError(null)
    try {
      const sent = await requestCode(phone, role)
      setWaitLeft(sent.resendAfterSeconds)
      setCode("")
      setNotice(t("login.resent"))
    } catch (failure) {
      setError(
        failure instanceof ApiError ? failure.message : t("errors.generic")
      )
    }
  }

  return (
    <ScreenShell
      brand={{ tagline: t("start.brand"), illustration: "phone-login" }}
      footer={
        <Button
          type="submit"
          form="code-form"
          size="xl"
          className="w-full"
          disabled={busy}
        >
          {busy ? t("login.verifying") : t("login.verify")}
        </Button>
      }
    >
      <div className="flex items-center justify-between">
        <BackButton to={`/login/${role}`} />
        <span className="text-sm font-medium text-muted-foreground">
          {t(role === "farmer" ? "login.farmerTag" : "login.officerTag")}
        </span>
      </div>
      <IllustrationCard
        name="phone-login"
        className="h-[210px] py-2 lg:hidden"
      />

      <form
        id="code-form"
        noValidate
        onSubmit={(e) => void verify(e)}
        className="space-y-4"
      >
        <div className="space-y-2">
          <QuestionTitle title={t("login.codeTitle")} audioKey="code" />
          <p className="text-sm font-medium text-muted-foreground lg:text-base lg:font-normal">
            {t("login.sentTo", { phone: maskPhone(phone) })}{" "}
            <Link to={`/login/${role}`} className="ml-2 text-primary underline">
              {t("login.change")}
            </Link>
          </p>
        </div>
        <CodeInput
          id="code"
          label={t("login.codeLabel")}
          value={code}
          onChange={(value) => {
            setCode(value)
            setError(null)
          }}
          invalid={error !== null}
          describedBy={error ? "code-error" : undefined}
        />
        {error ? (
          <p
            id="code-error"
            role="alert"
            className="text-sm font-medium text-destructive"
          >
            {error}
          </p>
        ) : null}
        <p
          aria-live="polite"
          className="text-sm font-medium text-muted-foreground"
        >
          {waitLeft > 0 ? (
            t("login.resendIn", { time: formatCountdown(waitLeft) })
          ) : (
            <>
              {t("login.resendPrompt")}{" "}
              <button
                type="button"
                onClick={() => void resend()}
                className="text-primary underline"
              >
                {t("login.resend")}
              </button>
            </>
          )}
        </p>
        {notice && waitLeft > 0 ? (
          <p className="text-sm font-medium text-primary">{notice}</p>
        ) : null}
      </form>
    </ScreenShell>
  )
}
