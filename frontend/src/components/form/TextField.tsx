import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

/** The rounded text box from the design (Figma "Text Input"): 56 px tall, green border, red when wrong. */
export function TextField({
  invalid = false,
  className,
  ...props
}: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        "h-14 w-full rounded-[30px] border-2 bg-card px-5 text-base font-medium text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:border-border disabled:bg-muted disabled:text-muted-foreground",
        invalid ? "border-destructive" : "border-primary",
        className
      )}
      {...props}
    />
  )
}
