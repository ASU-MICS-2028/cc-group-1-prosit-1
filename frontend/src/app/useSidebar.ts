import { useState } from "react"

const SIDEBAR_KEY = "agroconnect.sidebar"

/** Whether the desktop sidebar is open; remembered on this device (Figma "Sidebar Tab"). */
export function useSidebar() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) !== "closed"
    } catch {
      return true
    }
  })
  const toggle = () =>
    setOpen((was) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, was ? "closed" : "open")
      } catch {
        // Private mode or storage blocked: the choice just is not remembered.
      }
      return !was
    })
  return { open, toggle }
}
