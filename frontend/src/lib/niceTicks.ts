/** Round numbers for an axis: 0 up to a "nice" top (1, 2 or 5 × 10ⁿ steps), about four steps. */
export function niceTicks(max: number, steps = 4): number[] {
  if (max <= 0) return [0, 1]
  const raw = max / steps
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= raw)!
  const top = Math.ceil(max / step) * step
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
}
