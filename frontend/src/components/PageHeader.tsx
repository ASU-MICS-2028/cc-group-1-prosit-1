import type { ReactNode } from "react"

/** The big green page title from the design, with room for an action on the right. */
export function PageHeader({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <h1 className="text-3xl font-bold tracking-tight text-primary">
        {title}
      </h1>
      {action}
    </header>
  )
}
