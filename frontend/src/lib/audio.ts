import i18n from "@/i18n"

/**
 * The recorded prompt for a screen or question, in the current language:
 * /audio/<lang>/<key>.mp3 (ADR 0014). Until a recording exists the speaker button stays silent.
 */
export function promptAudio(key: string): string {
  return `/audio/${i18n.language}/${key}.mp3`
}
