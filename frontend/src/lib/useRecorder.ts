import { useEffect, useRef, useState } from "react"

/** The longest voice note: two minutes, then recording stops by itself. */
export const MAX_SECONDS = 120

export interface Recording {
  blob: Blob
  type: string
  seconds: number
  url: string
}

/**
 * Records a voice note with the phone's microphone (MediaRecorder). Hold the button to record, let go to
 * stop; tapping start and stop works too. Chrome records audio/webm, Safari audio/mp4.
 */
export function useRecorder() {
  const [recording, setRecording] = useState<Recording | null>(null)
  const [active, setActive] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [problem, setProblem] = useState<"unsupported" | "denied" | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const started = useRef(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current)
      recorder.current?.stream.getTracks().forEach((t) => t.stop())
    },
    []
  )
  useEffect(
    () => () => void (recording && URL.revokeObjectURL(recording.url)),
    [recording]
  )

  async function start() {
    if (active) return
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setProblem("unsupported")
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setProblem("denied")
      return
    }
    setProblem(null)
    const chunks: Blob[] = []
    const media = new MediaRecorder(stream)
    media.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)
    media.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      const type = media.mimeType || "audio/webm"
      const blob = new Blob(chunks, { type })
      const length = Math.max(
        1,
        Math.round((Date.now() - started.current) / 1000)
      )
      setRecording({
        blob,
        type,
        seconds: length,
        url: URL.createObjectURL(blob),
      })
    }
    recorder.current = media
    started.current = Date.now()
    setSeconds(0)
    setActive(true)
    media.start()
    timer.current = setInterval(() => {
      const s = Math.round((Date.now() - started.current) / 1000)
      setSeconds(s)
      if (s >= MAX_SECONDS) stop()
    }, 250)
  }

  function stop() {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setActive(false)
    if (recorder.current?.state === "recording") recorder.current.stop()
  }

  return {
    recording,
    active,
    seconds,
    problem,
    start: () => void start(),
    stop,
    clear: () => setRecording(null),
  }
}

/** The recording as base64 for the API (the "data:...;base64," prefix removed). */
export function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "")
    reader.onerror = () => reject(reader.error ?? new Error("read failed"))
    reader.readAsDataURL(blob)
  })
}
