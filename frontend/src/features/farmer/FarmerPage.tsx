import type { ReactNode } from "react"
import type { DataSource } from "@/api/farmer"
import { BackHeader } from "@/components/Blocks"
import { cn } from "@/lib/utils"
import { DataStatus } from "./DataStatus"
import type { ServerData } from "./useServerData"

/** The frame of every farmer sub-page: back to Home, the title, the data status line, the content. */
export function FarmerPage({
  title,
  subtitle,
  source,
  state,
  wide = false,
  children,
}: {
  title: string
  subtitle?: string
  source?: DataSource
  state?: ServerData<unknown>
  /** Use the full width on computers (tables, 7-day forecast) */
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "mx-auto flex flex-col gap-5",
        wide ? "max-w-6xl" : "max-w-3xl"
      )}
    >
      <BackHeader title={title} subtitle={subtitle} to="/farmer" tone="green" />
      {state ? <DataStatus source={source} state={state} /> : null}
      {children}
    </div>
  )
}
