import { useSyncExternalStore } from "react"
import { BASE } from "@/api/client"
import i18n from "@/i18n"

/** Languages the server can speak through GhanaNLP Khaya (ADR 0036); English uses the phone's voice. */
const SERVER_SPOKEN = ["tw", "ee", "dag"]

/**
 * Where to get a sentence spoken in the current language: the speech endpoint for Twi, Ewe and Dagbani,
 * nothing for English (the phone's voice reads it). The server says 404 until the Khaya key is set, and
 * the players then fall back to the phone's voice.
 */
export function speechUrl(text: string): string | undefined {
  const language = i18n.language
  if (
    !SERVER_SPOKEN.includes(language) ||
    text.length === 0 ||
    text.length > 500
  )
    return undefined
  return `${BASE}/api/speech?lang=${language}&text=${encodeURIComponent(text)}`
}

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
  stopQuiet()
  stopRecording()
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
  if (!current || current.paused) return
  if (player) player.pause()
  else if (canSpeak()) window.speechSynthesis.pause()
  else return
  set({
    ...current,
    paused: true,
    elapsedBefore: current.elapsedBefore + (Date.now() - (current.since ?? 0)),
    since: null,
  })
}

export function resumeSpeech() {
  if (!current || !current.paused) return
  if (player) void player.play().catch(() => {})
  else if (canSpeak()) window.speechSynthesis.resume()
  else return
  set({ ...current, paused: false, since: Date.now() })
}

/** Stops reading and closes the overlay. */
export function stopSpeech() {
  reading = null
  stopRecording()
  if (canSpeak()) window.speechSynthesis.cancel()
  set(null)
}

// ---------- Recordings in the overlay ----------

/** The recording playing in the overlay, if it is a recording and not the device voice. */
let player: HTMLAudioElement | null = null

function stopRecording() {
  if (!player) return
  const was = player
  player = null
  was.pause()
}

/**
 * Plays something long in the Playing overlay (a lesson, a voice note, a profile): the recording at
 * `src` when there is one, otherwise the device voice reads `text`. Pause, resume and stop work the
 * same for both.
 */
export function listen(text: string, src?: string): boolean {
  stopQuiet()
  stopSpeech()
  const sources = [src, speechUrl(text)].filter(
    (s, i, all): s is string => !!s && all.indexOf(s) === i
  )
  if (sources.length === 0 || typeof Audio === "undefined") return speak(text)
  set({
    language: i18n.language,
    progress: 0,
    paused: false,
    elapsedBefore: 0,
    since: Date.now(),
  })
  const next = (i: number) => {
    if (i >= sources.length) {
      player = null
      speak(text)
      return
    }
    const audio = new Audio(sources[i])
    player = audio
    audio.ontimeupdate = () => {
      if (player === audio && current && audio.duration > 0)
        set({ ...current, progress: audio.currentTime / audio.duration })
    }
    audio.onended = () => {
      if (player !== audio) return
      player = null
      set(null)
    }
    audio.play().catch(() => {
      // not there (no recording, no key for this language yet): try the next voice
      if (player === audio) next(i + 1)
    })
  }
  next(0)
  return true
}

// ---------- Speaker buttons (no overlay) ----------

/**
 * The small round speaker buttons beside a question, a label or a language play without the overlay:
 * one tap plays, the next tap stops. One at a time across the app. Recording first, device voice after.
 */
let quiet: { key: string; stop: () => void } | null = null
const quietListeners = new Set<() => void>()

function setQuiet(next: typeof quiet) {
  quiet = next
  quietListeners.forEach((notify) => notify())
}

/** Which speaker button is playing (its key), or null. */
export function useQuietKey(): string | null {
  return useSyncExternalStore(
    (notify) => {
      quietListeners.add(notify)
      return () => quietListeners.delete(notify)
    },
    () => quiet?.key ?? null,
    () => null
  )
}

export function stopQuiet() {
  if (!quiet) return
  const was = quiet
  setQuiet(null)
  was.stop()
}

function speakQuietly(key: string, text: string) {
  if (!canSpeak() || text.trim() === "") return setQuiet(null)
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = `${i18n.language}-GH`
  utterance.rate = 0.9
  const done = () => {
    if (quiet?.key === key) setQuiet(null)
  }
  utterance.onend = done
  utterance.onerror = done
  setQuiet({ key, stop: () => canSpeak() && window.speechSynthesis.cancel() })
  window.speechSynthesis.speak(utterance)
}

/** Plays (or, when it is already playing, stops) one speaker button: recording, server voice, then the phone's. */
export function toggleQuiet(key: string, text: string, src?: string) {
  if (quiet?.key === key) return stopQuiet()
  stopQuiet()
  stopSpeech()
  const sources = [src, speechUrl(text)].filter(
    (s, i, all): s is string => !!s && all.indexOf(s) === i
  )
  const next = (i: number) => {
    if (i >= sources.length || typeof Audio === "undefined")
      return speakQuietly(key, text)
    const audio = new Audio(sources[i])
    setQuiet({ key, stop: () => audio.pause() })
    audio.onended = () => {
      if (quiet?.key === key) setQuiet(null)
    }
    audio.play().catch(() => {
      if (quiet?.key === key) next(i + 1)
    })
  }
  next(0)
}
