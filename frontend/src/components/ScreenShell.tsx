import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

/** The cream panel on the left of the desktop start screens (Figma D01 to D03). */
export interface Brand {
  /** One line under "AgroConnect" */
  tagline: string
  /** Picture in public/illustrations, without .svg */
  illustration: string
}

/**
 * A full screen without the bottom bar (start, log in, forms). Three sizes, switched by screen width:
 * - phone (< 768 px): edge to edge, the main button (`footer`) pinned to the bottom;
 * - tablet (768 to 1023 px): the same phone layout as a centred card;
 * - computer (1024 px and up), when `brand` is given: the desktop design, a brand panel on the
 *   left and the content centred on the right, with the button straight under it.
 */
export function ScreenShell({
  children,
  footer,
  brand,
  className,
}: {
  children: ReactNode
  footer?: ReactNode
  brand?: Brand
  className?: string
}) {
  const { t } = useTranslation()

  return (
    <main
      className={cn(
        "min-h-svh bg-background md:grid md:place-items-center md:bg-muted md:p-8",
        brand && "lg:flex lg:items-stretch lg:gap-10 lg:bg-background"
      )}
    >
      {brand ? (
        <aside
          aria-hidden
          className="sticky top-8 hidden h-[calc(100svh-4rem)] max-h-[56rem] min-h-[36rem] w-[min(40rem,45vw)] shrink-0 flex-col gap-4 overflow-hidden rounded-[30px] bg-cream p-10 lg:flex"
        >
          <p className="text-2xl leading-9 font-semibold text-primary">
            {t("app.name")}
          </p>
          <p className="max-w-[30rem] text-xl leading-[30px] font-medium text-foreground">
            {brand.tagline}
          </p>
          <img
            src={`/illustrations/${brand.illustration}.svg`}
            alt=""
            decoding="async"
            className="mx-auto mt-auto max-h-[60%] w-full max-w-[33rem] object-contain object-bottom"
          />
        </aside>
      ) : null}

      <div
        className={cn(
          "w-full",
          brand && "lg:flex lg:flex-1 lg:items-center lg:justify-center"
        )}
      >
        <div
          className={cn(
            "mx-auto flex min-h-svh w-full max-w-md flex-col gap-6 bg-background px-4 pt-3 pb-6 md:min-h-[min(52rem,calc(100svh-4rem))] md:rounded-[30px] md:pt-6 md:shadow-lg md:ring-1 md:ring-border",
            brand &&
              "lg:min-h-0 lg:max-w-[28.75rem] lg:gap-[18px] lg:rounded-none lg:p-0 lg:shadow-none lg:ring-0",
            className
          )}
        >
          {children}
          {footer ? (
            <div className={cn("mt-auto pt-2", brand && "lg:mt-0 lg:pt-0")}>
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
