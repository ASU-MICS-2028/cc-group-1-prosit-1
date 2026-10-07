import { useLiveQuery } from "dexie-react-hooks"
import { useEffect, useMemo } from "react"
import { db } from "@/db/local"

/** A photo kept on this phone, as an address an <img> can show; null while loading or missing. */
export function usePhotoUrl(id: string | null | undefined): string | null {
  const photo = useLiveQuery(
    async () => (id ? ((await db.photos.get(id)) ?? null) : null),
    [id]
  )
  const url = useMemo(
    () => (photo ? URL.createObjectURL(photo.blob) : null),
    [photo]
  )
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url)
    },
    [url]
  )
  return url
}
