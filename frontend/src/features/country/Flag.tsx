import type { CountryCode } from "@/lib/country"
import { cn } from "@/lib/utils"

/** Small flags drawn in SVG (no image download): Ghana, Nigeria, Kenya. */
export function Flag({
  country,
  className,
}: {
  country: CountryCode
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 48 32"
      aria-hidden
      className={cn("h-8 w-12 shrink-0 rounded-md shadow-sm", className)}
    >
      {country === "GH" ? (
        <>
          <rect width="48" height="11" fill="#ce1126" />
          <rect y="10.66" width="48" height="10.67" fill="#fcd116" />
          <rect y="21.33" width="48" height="10.67" fill="#006b3f" />
          <polygon
            points="24,11.2 25.4,15.3 29.7,15.3 26.2,17.9 27.5,22 24,19.5 20.5,22 21.8,17.9 18.3,15.3 22.6,15.3"
            fill="#000"
          />
        </>
      ) : country === "NG" ? (
        <>
          <rect width="16" height="32" fill="#008751" />
          <rect x="16" width="16" height="32" fill="#fff" />
          <rect x="32" width="16" height="32" fill="#008751" />
        </>
      ) : (
        <>
          <rect width="48" height="32" fill="#fff" />
          <rect width="48" height="9.6" fill="#000" />
          <rect y="11.2" width="48" height="9.6" fill="#be0027" />
          <rect y="22.4" width="48" height="9.6" fill="#007a3d" />
        </>
      )}
    </svg>
  )
}
