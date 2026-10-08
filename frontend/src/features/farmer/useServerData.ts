import { useLiveQuery } from "dexie-react-hooks"
import { useEffect, useState } from "react"
import { ApiError } from "@/api/client"
import { useSession } from "@/auth/session"
import { db } from "@/db/local"

export interface ServerData<T> {
  /** The newest answer: from the server, or the copy kept on the device when offline */
  data: T | undefined
  /** When that answer was saved on the device (ISO) */
  savedAt: string | undefined
  /** Still asking the server */
  loading: boolean
  /** The last call failed (no network, or a server problem) */
  error: ApiError | null
  /** Ask the server again */
  reload: () => void
}

/**
 * Data from the server that should still show offline: the screen gets the copy kept on the device at
 * once, then the fresh answer when the network allows (stale while revalidate). Each answer is saved
 * under the signed-in person, so a shared phone never mixes two farmers' data.
 */
export function useServerData<T>(
  what: string,
  load: () => Promise<T>
): ServerData<T> {
  const userId = useSession()?.user.id ?? "anonymous"
  const key = `${userId}:${what}`
  const cached = useLiveQuery(() => db.cache.get(key), [key])
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{
    loading: boolean
    error: ApiError | null
  }>({
    loading: true,
    error: null,
  })

  useEffect(() => {
    let alive = true
    load()
      .then(async (data) => {
        await db.cache.put({ key, data, savedAt: new Date().toISOString() })
        if (alive) setState({ loading: false, error: null })
      })
      .catch((error: unknown) => {
        if (!alive) return
        setState({
          loading: false,
          error:
            error instanceof ApiError
              ? error
              : new ApiError(0, "OFFLINE", String(error)),
        })
      })
    return () => {
      alive = false
    }
  }, [key, load, attempt])

  return {
    data: cached?.data as T | undefined,
    savedAt: cached?.savedAt,
    loading: state.loading,
    error: state.error,
    reload: () => {
      setState({ loading: true, error: null })
      setAttempt((n) => n + 1)
    },
  }
}
