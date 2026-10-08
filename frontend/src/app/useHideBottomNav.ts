import { useMatches } from "react-router-dom"

/** A page can ask for no bottom bar on phones with `handle: { hideBottomNav: true }` in the router. */
export function useHideBottomNav() {
  return useMatches().some(
    (match) =>
      (match.handle as { hideBottomNav?: boolean } | undefined)?.hideBottomNav
  )
}
