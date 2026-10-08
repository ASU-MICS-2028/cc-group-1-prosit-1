import { useSyncExternalStore } from "react"
import i18n from "@/i18n"

/** What the device is reading aloud right now, shown by the Playing overlay (Figma "Overlay · Playing Audio"). */
export interface Speaking {
  /** The language it is read in, e.g. "tw" */
  language: string
  /** How much of the text has been read, 0 to 1 (from the voice's word boundaries) */
  progress: number
  paused: boolean
  /** Reading time so far, in milliseconds, not counting pauses */
  elapsedBefore: number
  /** When the current stretch of reading started (Date.now()), or null while paused */
  since: number | null
}

let current: Speaking | null = null
const listeners = new Set<() => void>()

function set(next: Speaking | null) {
  current = next
  listeners.forEach((notify) => notify())
}

/** What is being read aloud, or null. Updates as the reading moves on. */
export function useSpeaking(): Speaking | null {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify)
      return () => listeners.delete(notify)
    },
    () => current,
    () => null
  )
}

const canSpeak = () =>
  typeof window !== "undefined" && "speechSynthesis" in window

/**
 * Reads a text aloud with the device's own voice (Listen to this profile). Recorded prompts are
 * the plan for Twi, Ewe and Dagbani (ADR 0014); phones have no voices for them yet, so this
 * speaks the current text with whatever voice the phone has. Returns false when the phone cannot
 * speak at all, so the screen can say so. While it reads, the Playing overlay shows (SpeechOverlay).
 */
export function speak(text: string): boolean {
  if (!canSpeak()) return false
  window.speechSynthesis.cancel() // a second tap restarts, never stacks
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = `${i18n.language}-GH`
  utterance.rate = 0.9
  const done = () => {
    if (current && reading === utterance) set(null)
  }
  utterance.onboundary = (event) => {
    if (current && reading === utterance && text.length > 0)
      set({ ...current, progress: Math.min(1, event.charIndex / text.length) })
  }
  utterance.onend = done
  utterance.onerror = done
  reading = utterance
  set({
    language: i18n.language,
    progress: 0,
    paused: false,
    elapsedBefore: 0,
    since: Date.now(),
  })
  window.speechSynthesis.speak(utterance)
  return true
}

/** The utterance being read: a finished older one must not close the overlay of a newer one. */
let reading: SpeechSynthesisUtterance | null = null

export function pauseSpeech() {
  if (!current || current.paused || !canSpeak()) return
  window.speechSynthesis.pause()
  set({
    ...current,
    paused: true,
    elapsedBefore: current.elapsedBefore + (Date.now() - (current.since ?? 0)),
    since: null,
  })
}

export function resumeSpeech() {
  if (!current || !current.paused || !canSpeak()) return
  window.speechSynthesis.resume()
  set({ ...current, paused: false, since: Date.now() })
}

/** Stops reading and closes the overlay. */
export function stopSpeech() {
  reading = null
  if (canSpeak()) window.speechSynthesis.cancel()
  set(null)
}
