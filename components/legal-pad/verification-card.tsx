// @ts-nocheck
"use client"

import type { PendingReview, ReviewAction } from "@/lib/types/review"
import { confidenceToPercent, confidenceToLabel, confidenceToOpacity } from "@/lib/utils/confidence"
import { cn } from "@/lib/utils"

interface VerificationCardProps {
  item: PendingReview
  onReview: (id: string, action: ReviewAction, notes?: string) => Promise<void>
}

export function VerificationCard({ item, onReview }: VerificationCardProps) {
  const pct = confidenceToPercent(item.confidence)
  const label = confidenceToLabel(item.confidence)

  const handleAction = async (action: ReviewAction) => {
    await onReview(item.id, action)
  }

  return (
    <div className={cn("glass rounded-lg p-3 space-y-2", confidenceToOpacity(item.confidence))}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{item.entityName}</p>
          {item.entityValue && (
            <p className="text-[10px] text-muted-foreground truncate">{item.entityValue}</p>
          )}
        </div>
        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] bg-muted text-muted-foreground capitalize">
          {item.extractionType.replace("_", " ")}
        </span>
      </div>

      {/* Confidence bar */}
      <div className="space-y-0.5">
        <div className="h-1 w-full rounded-full bg-muted">
          <div
            className="h-1 rounded-full bg-primary transition-all"
            style={{ width: pct }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">{label} confidence · {pct}</p>
      </div>

      {item.sectionText && (
        <p className="text-[10px] text-foreground/60 line-clamp-2 border-t border-border/20 pt-2">
          {item.sectionText}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => handleAction("approved")}
          className="flex-1 rounded py-1 text-[10px] font-medium text-green-400 hover:bg-green-400/10 transition-colors"
        >
          Verify ✓
        </button>
        <button
          type="button"
          onClick={() => handleAction("rejected")}
          className="flex-1 rounded py-1 text-[10px] font-medium text-red-400 hover:bg-red-400/10 transition-colors"
        >
          Dismiss ✗
        </button>
      </div>
    </div>
  )
}
