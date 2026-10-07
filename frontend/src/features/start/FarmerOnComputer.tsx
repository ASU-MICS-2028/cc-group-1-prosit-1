import qrcode from "qrcode-generator"
import type { ReactNode } from "react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

/** The app's own address, without the page, for the farmer to open on the phone. */
function appAddress() {
  return window.location.origin
}

/** QR code for the address as an SVG data URL (no network: drawn on the device). */
function qrDataUrl(text: string) {
  const qr = qrcode(0, "M")
  qr.addData(text)
  qr.make()
  return qr.createDataURL(6, 2)
}

/**
 * D02f "Farmers use AgroConnect on the phone" (ADR 0024): farmers are phone only, so a computer
 * shows where to open the app instead of a farmer screen that was never designed for it. Used from
 * the desktop "Who are you?" link and when a farmer signs in on a computer anyway.
 */
export function FarmerOnComputer({ actions }: { actions: ReactNode }) {
  const { t } = useTranslation()
  const address = appAddress()
  const qr = useMemo(() => qrDataUrl(address), [address])
  const shown = address.replace(/^https?:\/\//, "")

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl leading-9 font-medium text-foreground">
          {t("farmerOnComputer.title")}
        </h1>
        <p className="text-base text-muted-foreground">
          {t("farmerOnComputer.subtitle")}
        </p>
      </div>
      <div className="flex items-center gap-5 rounded-[20px] border bg-card p-5">
        <img
          src={qr}
          alt={t("farmerOnComputer.qrAlt")}
          className="size-33 shrink-0 rounded-lg"
        />
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm text-muted-foreground">
            {t("farmerOnComputer.linkLabel")}
          </p>
          <p className="text-xl font-semibold break-all text-primary">
            {shown}
          </p>
          <p className="text-sm text-foreground">
            {t("farmerOnComputer.howTo")}
          </p>
        </div>
      </div>
      {actions}
      <p className="text-sm text-muted-foreground">
        {t("farmerOnComputer.basicPhone")}
      </p>
    </div>
  )
}
