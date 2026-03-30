export function confidenceLevel(score: number): "high" | "medium" | "low" {
  if (score >= 0.85) return "high"
  if (score >= 0.7) return "medium"
  return "low"
}

export function confidenceOpacity(score: number): number {
  if (score >= 0.85) return 1
  if (score >= 0.7) return 0.75
  return 0.45
}

export function needsReview(score: number): boolean {
  return score < 0.7
}

// ── Aliases used by components ─────────────────────────────────────────────

/** Returns a CSS opacity class string for a confidence score. */
export function confidenceToOpacity(score: number): string {
  if (score >= 0.85) return "opacity-100"
  if (score >= 0.7) return "opacity-75"
  return "opacity-45"
}

/** Returns a percentage string for a confidence score, e.g. "85%". */
export function confidenceToPercent(score: number): string {
  return `${Math.round(score * 100)}%`
}

/** Returns a human-readable label for a confidence score. */
export function confidenceToLabel(score: number): string {
  if (score >= 0.85) return "High"
  if (score >= 0.7) return "Medium"
  return "Low"
}
