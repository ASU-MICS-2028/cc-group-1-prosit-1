import type { ReactNode } from "react"
import type { DataSource } from "@/api/farmer"
import { BackHeader } from "@/components/Blocks"
import { cn } from "@/lib/utils"
import { DataStatus } from "./DataStatus"
import type { ServerData } from "./useServerData"

/**
 * The frame of every farmer page: back to Home, the title, the data status line, the content. Pages
 * that are bottom-bar tabs (Market) pass `tab`: a tab has no Back button.
 */
export function FarmerPage({
  title,
  subtitle,
  source,
  state,
  wide = false,
  tab = false,
  children,
}: {
  title: string
  subtitle?: string
  source?: DataSource
  state?: ServerData<unknown>
  /** Use the full width on computers (tables, 7-day forecast) */
  wide?: boolean
  /** A bottom-bar tab: no Back button */
  tab?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "mx-auto flex flex-col gap-5",
        wide ? "max-w-6xl" : "max-w-3xl"
      )}
    >
      <BackHeader
        title={title}
        subtitle={subtitle}
        to={tab ? false : "/farmer"}
        tone="green"
      />
      {state ? <DataStatus source={source} state={state} /> : null}
      {children}
    </div>
  )
}
