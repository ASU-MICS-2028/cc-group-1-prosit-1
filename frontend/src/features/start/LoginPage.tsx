import { useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { requestCode } from "@/api/auth"
import { ApiError } from "@/api/client"
import { BackButton } from "@/components/BackButton"
import { IllustrationCard } from "@/components/IllustrationCard"
import { PhoneField } from "@/components/PhoneField"
import { QuestionTitle } from "@/components/QuestionTitle"
import { ScreenShell } from "@/components/ScreenShell"
import { Button } from "@/components/ui/button"
import { toE164 } from "@/lib/phone"
import { roleFrom, type CodeScreenState } from "./login"

/** 02a / 02c Log in: the phone number gets a 6-digit SMS code. Officers and farmers use the same screen. */
export function Component() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const role = roleFrom(useParams().role)
  const [typed, setTyped] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function send(event: FormEvent) {
    event.preventDefault()
    const phone = toE164(typed)
    if (!phone) {
      setError(t("login.invalidPhone"))
      return
    }
    setError(null)
    setSending(true)
    try {
      const sent = await requestCode(phone, role)
      const state: CodeScreenState = {
        phone,
        resendAfterSeconds: sent.resendAfterSeconds,
      }
      void navigate(`/login/${role}/code`, { state })
    } catch (failure) {
      setError(
        failure instanceof ApiError ? failure.message : t("errors.generic")
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <ScreenShell
      brand={{ tagline: t("start.brand"), illustration: "phone-login" }}
      footer={
        <Button
          type="submit"
          form="login-form"
          size="xl"
          className="w-full"
          disabled={sending}
        >
          {sending ? t("login.sending") : t("login.send")}
        </Button>
      }
    >
      <div className="flex items-center justify-between">
        <BackButton to="/who" />
        <span className="text-sm font-medium text-muted-foreground">
          {t(role === "farmer" ? "login.farmerTag" : "login.officerTag")}
        </span>
      </div>
      <IllustrationCard
        name="phone-login"
        className="h-[210px] py-2 lg:hidden"
      />

      <form
        id="login-form"
        noValidate
        onSubmit={(e) => void send(e)}
        className="space-y-4"
      >
        {/* Phone (Figma 02a): the question with its speaker. */}
        <div className="space-y-2 lg:hidden">
          <QuestionTitle title={t("login.title")} audioKey="login" />
          <p className="text-sm font-medium text-muted-foreground">
            {t("login.sms")}
          </p>
        </div>
        {/* Computer (Figma D02) */}
        <div className="hidden space-y-[18px] lg:block">
          <h1 className="text-2xl leading-9 font-semibold text-foreground">
            {t("login.desktopTitle")}
          </h1>
          <p className="text-base text-muted-foreground">
            {t("login.desktopSms")}
          </p>
        </div>
        <div className="space-y-3">
          <PhoneField
            id="phone"
            value={typed}
            onChange={(value) => {
              setTyped(value)
              setError(null)
            }}
            invalid={error !== null}
            describedBy={error ? "phone-error" : "phone-hint"}
            autoFocus
          />
          {error ? (
            <p
              id="phone-error"
              role="alert"
              className="px-3 text-sm font-medium text-destructive"
            >
              {error}
            </p>
          ) : (
            <p
              id="phone-hint"
              className="px-3 text-sm font-medium text-muted-foreground"
            >
              {t("login.shared")}
            </p>
          )}
        </div>
      </form>
    </ScreenShell>
  )
}
