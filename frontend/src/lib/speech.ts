import i18n from "@/i18n"

/**
 * Reads a text aloud with the device's own voice (Listen to this profile). Recorded prompts are
 * the plan for Twi, Ewe and Dagbani (ADR 0014); phones have no voices for them yet, so this
 * speaks the current text with whatever voice the phone has. Returns false when the phone cannot
 * speak at all, so the screen can say so.
 */
export function speak(text: string): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return false
  window.speechSynthesis.cancel() // a second tap restarts, never stacks
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = `${i18n.language}-GH`
  utterance.rate = 0.9
  window.speechSynthesis.speak(utterance)
  return true
}
