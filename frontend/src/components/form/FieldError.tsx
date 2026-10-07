import { CircleAlert } from "lucide-react"

/** The pink box under a field with a problem (Figma 19 Form Error). Read out by screen readers. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p
      id={id}
      role="alert"
      className="flex items-center gap-2 rounded-[14px] bg-destructive-soft px-3 py-2.5 text-sm font-medium text-destructive"
    >
      <CircleAlert aria-hidden className="size-5 shrink-0" />
      {message}
    </p>
  )
}
