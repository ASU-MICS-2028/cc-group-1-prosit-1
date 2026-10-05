import { useState, type ReactNode } from "react"
import { Plus } from "lucide-react"
import { PageHeader } from "@/components/PageHeader"
import { LanguageOptions } from "@/components/LanguageOptions"
import { StatusChip, SyncIcon } from "@/components/SyncStatus"
import { Button } from "@/components/ui/button"
import { FarmerRow } from "@/features/farmers/FarmerRow"
import type { FarmerSummary } from "@/features/farmers/farmers"
import type { LanguageCode } from "@/i18n"
import { SYNC_STATUSES } from "@/lib/syncStatus"

// Development only (see the router): the component sheet from Figma, to check the
// look on a phone and a computer without needing real data.
const SAMPLE: FarmerSummary[] = [
  {
    id: "1",
    name: "Ama Boateng",
    village: "Tolon",
    phone: "+233240000000",
    status: "waiting",
  },
  {
    id: "2",
    name: "Kwame Mensah",
    village: "Savelugu",
    phone: "+233550001234",
    status: "synced",
  },
  {
    id: "3",
    name: "Fatima Abdulai",
    village: "Tamale",
    phone: "+233200004321",
    status: "failed",
  },
]

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

export function Component() {
  const [language, setLanguage] = useState<LanguageCode>("tw")

  return (
    <div className="space-y-8">
      <PageHeader title="Components" />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          <Block title="Buttons">
            <div className="space-y-3">
              <Button size="xl" className="w-full">
                Continue
              </Button>
              <Button size="xl" variant="secondary" className="w-full">
                Continue
              </Button>
              <Button size="xl" className="w-full">
                <Plus aria-hidden /> Register a farmer
              </Button>
            </div>
          </Block>
          <Block title="Status chips">
            <div className="flex flex-wrap gap-2">
              {SYNC_STATUSES.map((status) => (
                <StatusChip key={status} status={status} count={3} />
              ))}
            </div>
            <div className="flex gap-3">
              {SYNC_STATUSES.map((status) => (
                <SyncIcon key={status} status={status} />
              ))}
            </div>
          </Block>
          <Block title="Farmer rows">
            <ul className="space-y-3">
              {SAMPLE.map((farmer) => (
                <li key={farmer.id}>
                  <FarmerRow farmer={farmer} />
                </li>
              ))}
            </ul>
          </Block>
        </div>
        <Block title="Language options">
          <LanguageOptions value={language} onChange={setLanguage} />
        </Block>
      </div>
    </div>
  )
}
