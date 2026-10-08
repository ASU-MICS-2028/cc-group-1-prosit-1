import { Dialog } from "@base-ui/react/dialog"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * The question that slides up from the bottom (Figma 21 Update Available, 25 Log Out): a round
 * icon, a title, a short text and the buttons. On computers it is a centred box. Focus stays
 * inside while it is open, and Escape or tapping outside closes it.
 */
export function Sheet({
  open,
  onClose,
  icon,
  tone = "green",
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  icon: ReactNode
  tone?: "green" | "red"
  title: string
  /** Text and buttons */
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/30" />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-4 rounded-t-[30px] bg-card px-5 pt-3 pb-8 outline-none md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-110 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[30px] md:pt-8">
          <span
            aria-hidden
            className="h-1 w-10 rounded-full bg-border md:hidden"
          />
          <span
            aria-hidden
            className={cn(
              "flex size-16 items-center justify-center rounded-full [&_svg]:size-7",
              tone === "red"
                ? "bg-destructive-soft text-destructive"
                : "bg-secondary text-primary"
            )}
          >
            {icon}
          </span>
          <Dialog.Title className="text-xl leading-7.5 font-medium text-foreground">
            {title}
          </Dialog.Title>
          <div className="flex w-full flex-col gap-3">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
