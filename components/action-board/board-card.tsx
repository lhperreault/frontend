"use client"

import { useRouter } from "next/navigation"
import { buildSectionUrl } from "@/lib/utils/navigate-to-section"
import { cn } from "@/lib/utils"

export interface BoardCardData {
  id: string
  text: string
  confidence?: number
  documentId?: string
  sectionId?:  string
  caseId?:     string
  /** Evidence count for claims */
  evidenceCount?: number
  /** ISO date string for obligations */
  dateValue?: string
  /** Status badge: "Overdue" | "Due soon" | "No evidence" | etc. */
  badge?: string
}

interface BoardCardProps {
  card: BoardCardData
}

const BADGE_STYLES: Record<string, string> = {
  "Overdue":     "bg-red-500/10 text-red-400",
  "Due soon":    "bg-amber-500/10 text-amber-400",
  "No evidence": "bg-red-500/10 text-red-400",
}

export function BoardCard({ card }: BoardCardProps) {
  const router = useRouter()

  const handleClick = () => {
    if (!card.caseId || !card.documentId) return
    router.push(buildSectionUrl(card.caseId, card.documentId, card.sectionId))
  }

  const clickable = !!card.documentId

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? handleClick : undefined}
      onKeyDown={clickable ? (e) => e.key === "Enter" && handleClick() : undefined}
      className={cn(
        "glass min-h-[60px] rounded-lg px-2.5 py-2 flex flex-col justify-between gap-1",
        clickable
          ? "cursor-pointer transition-colors hover:bg-muted/10 focus:outline-none focus:ring-1 focus:ring-primary"
          : "",
      )}
    >
      {/* Label */}
      <p className="line-clamp-2 text-[11px] leading-snug">{card.text}</p>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-1">
        {/* Freeform / status badge */}
        {card.badge && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[9px] font-medium",
              BADGE_STYLES[card.badge] ?? "bg-muted text-muted-foreground",
            )}
          >
            {card.badge}
          </span>
        )}

        {/* Evidence count badge */}
        {card.evidenceCount !== undefined && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[9px] font-medium",
              card.evidenceCount > 0
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-red-500/10 text-red-400",
            )}
          >
            {card.evidenceCount} ev.
          </span>
        )}

        {/* Due date */}
        {card.dateValue && !card.badge && (
          <span className="text-[9px] text-muted-foreground">
            {card.dateValue}
          </span>
        )}

        {/* Confidence — right-aligned */}
        {card.confidence != null && (
          <span
            className={cn(
              "ml-auto text-[9px] tabular-nums",
              card.confidence >= 0.85
                ? "text-emerald-500"
                : card.confidence >= 0.7
                ? "text-amber-500"
                : "text-slate-400",
            )}
          >
            {Math.round(card.confidence * 100)}%
          </span>
        )}
      </div>
    </div>
  )
}
