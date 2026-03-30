// @ts-nocheck
"use client"

import { useState } from "react"
import type { PendingReview, ReviewAction } from "@/lib/types/review"
import { confidenceToPercent, confidenceToLabel, confidenceToOpacity } from "@/lib/utils/confidence"
import { cn } from "@/lib/utils"

interface ReviewItemProps {
  item: PendingReview
  onReview: (id: string, action: ReviewAction, notes?: string) => Promise<void>
}

export function ReviewItem({ item, onReview }: ReviewItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)

  const handle = async (action: ReviewAction) => {
    setLoading(true)
    await onReview(item.id, action, notes || undefined)
    setLoading(false)
  }

  return (
    <div className={cn("glass rounded-xl p-4 space-y-3", confidenceToOpacity(item.confidence))}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground">
              {item.extractionType.replace("_", " ")}
            </span>
            {item.documentName && (
              <span className="truncate text-[10px] text-muted-foreground">{item.documentName}</span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium">{item.entityName}</p>
          {item.entityValue && (
            <p className="text-xs text-muted-foreground">{item.entityValue}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold">{confidenceToPercent(item.confidence)}</p>
          <p className="text-[10px] text-muted-foreground">{confidenceToLabel(item.confidence)}</p>
        </div>
      </div>

      {item.sectionText && (
        <p className="border-l-2 border-border/40 pl-3 text-[10px] text-foreground/60 line-clamp-3">
          {item.sectionText}
        </p>
      )}

      {expanded && (
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional correction notes..."
          rows={2}
          className="w-full glass resize-none rounded-lg border border-border/50 bg-transparent px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        />
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handle("approved")}
          disabled={loading}
          className="flex-1 rounded-lg py-1.5 text-xs font-medium text-green-400 hover:bg-green-400/10 transition-colors disabled:opacity-40"
        >
          Verify ✓
        </button>
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          {expanded ? "▲" : "Edit"}
        </button>
        {expanded && (
          <button
            type="button"
            onClick={() => handle("corrected")}
            disabled={loading}
            className="flex-1 rounded-lg py-1.5 text-xs font-medium text-yellow-400 hover:bg-yellow-400/10 transition-colors disabled:opacity-40"
          >
            Correct
          </button>
        )}
        <button
          type="button"
          onClick={() => handle("rejected")}
          disabled={loading}
          className="flex-1 rounded-lg py-1.5 text-xs font-medium text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
        >
          Reject ✗
        </button>
      </div>
    </div>
  )
}
