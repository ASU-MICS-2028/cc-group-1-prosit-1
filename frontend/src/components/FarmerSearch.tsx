import { Search } from "lucide-react"
import { useId, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

/** "Search farmers": opens My farmers with the words typed (Home on phones, the top bar on computers). */
export function FarmerSearch({ className }: { className?: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const id = useId()

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        void navigate(`/farmers?q=${encodeURIComponent(query.trim())}`)
      }}
      className={cn(
        "flex h-12 items-center gap-2 rounded-full border bg-card px-4 focus-within:ring-3 focus-within:ring-ring/50",
        className
      )}
    >
      <Search aria-hidden className="size-5 shrink-0 text-foreground" />
      <label htmlFor={id} className="sr-only">
        {t("home.search")}
      </label>
      <input
        id={id}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("home.search")}
        className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
      />
    </form>
  )
}
