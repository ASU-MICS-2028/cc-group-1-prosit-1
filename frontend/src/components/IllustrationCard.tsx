import { cn } from "@/lib/utils"

/**
 * The cream card with a picture from the design. Pictures are optimised SVG files in
 * public/illustrations, loaded only when shown (they are not part of the app download).
 */
export function IllustrationCard({
  name,
  className,
  imageClassName,
}: {
  /** File name in public/illustrations, without .svg */
  name: string
  className?: string
  imageClassName?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-[30px] bg-cream",
        className
      )}
    >
      <img
        src={`/illustrations/${name}.svg`}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn(
          "h-full w-auto max-w-full object-contain",
          imageClassName
        )}
      />
    </div>
  )
}
