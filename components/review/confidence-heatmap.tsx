// @ts-nocheck
"use client"

import type { Extraction } from "@/lib/types/extraction"
import { confidenceToGlow, GLOW_LABELS, type ConfidenceGlow } from "@/lib/constants/glow-colors"
import { confidenceToPercent } from "@/lib/utils/confidence"
import { cn } from "@/lib/utils"

interface ConfidenceHeatmapProps {
  extractions: Extraction[]
}

/**
 * Confidence Heatmap — visual summary of extraction confidence across a document.
 * Shows distribution by confidence band and a dot grid color-coded by glow class.
 */
export function ConfidenceHeatmap({ extractions }: ConfidenceHeatmapProps) {
  if (!extractions.length) {
    return <p className="text-xs text-muted-foreground">No extractions to display.</p>
  }

  const bands: Record<ConfidenceGlow, Extraction[]> = {
    "glow-verified":    extractions.filter(e => !e.isContradiction && e.confidence >= 0.9),
    "glow-unverified":  extractions.filter(e => !e.isContradiction && e.confidence >= 0.7 && e.confidence < 0.9),
    "glow-low-conf":    extractions.filter(e => !e.isContradiction && e.confidence < 0.7),
    "glow-contradicts": extractions.filter(e => !!e.isContradiction),
  }

  const avgConfidence = extractions.reduce((sum, e) => sum + e.confidence, 0) / extractions.length

  return (
    <div className="space-y-4">
      {/* Average bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Average confidence</span>
          <span className="font-medium">{confidenceToPercent(avgConfidence)}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{ width: confidenceToPercent(avgConfidence) }}
          />
        </div>
      </div>

      {/* Band breakdown */}
      <div className="grid grid-cols-2 gap-2">
        {(Object.entries(bands) as [ConfidenceGlow, Extraction[]][]).map(([glow, items]) => (
          <BandCard key={glow} glow={glow} count={items.length} total={extractions.length} />
        ))}
      </div>

      {/* Dot grid — one dot per extraction */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          All extractions
        </p>
        <div className="flex flex-wrap gap-1">
          {extractions.map((ext) => {
            const glow = confidenceToGlow(ext.confidence, ext.isContradiction)
            return (
              <div
                key={ext.id}
                title={`${ext.entityName} · ${confidenceToPercent(ext.confidence)}`}
                className={cn("h-2.5 w-2.5 rounded-sm", dotColorClass(glow))}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

function BandCard({ glow, count, total }: { glow: ConfidenceGlow; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const color = dotColorClass(glow)

  return (
    <div className="glass space-y-1 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5">
        <span className={cn("h-2 w-2 shrink-0 rounded-sm", color)} />
        <span className="text-[10px] text-muted-foreground">{GLOW_LABELS[glow]}</span>
      </div>
      <p className="text-sm font-semibold">{count}</p>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-1 rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function dotColorClass(glow: ConfidenceGlow): string {
  switch (glow) {
    case "glow-verified":    return "bg-[oklch(0.72_0.18_142)]"
    case "glow-unverified":  return "bg-[oklch(0.78_0.18_75)]"
    case "glow-contradicts": return "bg-[oklch(0.65_0.22_27)]"
    default:                 return "bg-[oklch(0.60_0.04_260)]"
  }
}
