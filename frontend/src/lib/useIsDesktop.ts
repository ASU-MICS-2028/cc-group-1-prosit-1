import { useEffect, useState } from "react"

/** The team's one breakpoint: 768 px and up is a computer or tablet (Tailwind md, ADR 0024). */
export const DESKTOP_QUERY = "(min-width: 768px)"

function matches() {
  return typeof window.matchMedia === "function"
    ? window.matchMedia(DESKTOP_QUERY).matches
    : false
}

/**
 * True on a computer-sized screen, kept up to date when the window is resized or a tablet turns.
 * The width decides, never the user agent (ADR 0024).
 */
export function useIsDesktop() {
  const [desktop, setDesktop] = useState(matches)
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const query = window.matchMedia(DESKTOP_QUERY)
    const update = () => setDesktop(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  return desktop
}
