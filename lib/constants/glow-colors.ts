// Semantic highlight colors for document annotations
// Used by document-highlighter.tsx and confidence-heatmap.tsx
export const GLOW = {
  verified:      "rgba(34, 197, 94, 0.22)",   // green — confirmed by HITL
  unverified:    "rgba(245, 158, 11, 0.22)",  // amber — extracted, not yet reviewed
  contradicts:   "rgba(239, 68, 68, 0.22)",   // red — conflicts with other evidence
  lowConfidence: "rgba(148, 163, 184, 0.15)", // gray — confidence < 0.7
} as const

export const GLOW_BORDER = {
  verified:      "rgba(34, 197, 94, 0.6)",
  unverified:    "rgba(245, 158, 11, 0.6)",
  contradicts:   "rgba(239, 68, 68, 0.6)",
  lowConfidence: "rgba(148, 163, 184, 0.35)",
} as const

export type GlowKey = keyof typeof GLOW

// ── Confidence-band glow types used by ConfidenceHeatmap ──────────────────

export type ConfidenceGlow =
  | "glow-verified"
  | "glow-unverified"
  | "glow-low-conf"
  | "glow-contradicts"

export const GLOW_LABELS: Record<ConfidenceGlow, string> = {
  "glow-verified":    "Verified (≥90%)",
  "glow-unverified":  "Unverified (70–89%)",
  "glow-low-conf":    "Low confidence (<70%)",
  "glow-contradicts": "Contradictions",
}

/**
 * Maps an extraction's confidence score (and optional contradiction flag)
 * to a ConfidenceGlow band for use in the heatmap.
 */
export function confidenceToGlow(
  confidence: number,
  isContradiction?: boolean,
): ConfidenceGlow {
  if (isContradiction) return "glow-contradicts"
  if (confidence >= 0.9) return "glow-verified"
  if (confidence >= 0.7) return "glow-unverified"
  return "glow-low-conf"
}
