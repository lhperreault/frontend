"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { TimelineEvent } from "@/lib/types/timeline-event"
import { formatTimelineDate } from "@/lib/utils/format-date"
import { cn } from "@/lib/utils"

const EVENT_TYPE_COLORS: Record<string, string> = {
  event:            "#34d399", // emerald
  procedural_event: "#c084fc", // purple
}

interface TimelineDotProps {
  event: TimelineEvent
  isActive?: boolean
  onClick?: (event: TimelineEvent) => void
  /** When provided, clicking navigates to the source document/section */
  caseId?: string
}

export function TimelineDot({ event, isActive, onClick, caseId }: TimelineDotProps) {
  const router = useRouter()
  const [showTooltip, setShowTooltip] = useState(false)
  const color = EVENT_TYPE_COLORS[event.event_type] ?? "#6b7280"

  const handleClick = () => {
    if (caseId && event.source_document_id) {
      const params = new URLSearchParams()
      params.set("doc", event.source_document_id)
      if (event.source_section_id) params.set("section", event.source_section_id)
      router.push(`/case/${caseId}/workspace?${params.toString()}`)
      return
    }
    onClick?.(event)
  }

  return (
    <div className="relative flex flex-col items-center">
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          "h-3 w-3 rounded-full border-2 transition-transform hover:scale-125",
          isActive ? "scale-125" : "",
          caseId && event.source_document_id ? "cursor-pointer" : "",
        )}
        style={{ backgroundColor: color, borderColor: color }}
        aria-label={event.event_label}
      />

      {showTooltip && (
        <div className="glass pointer-events-none absolute bottom-5 z-20 w-48 rounded-lg p-2.5 text-xs shadow-lg">
          <p className="font-medium">{event.event_label}</p>
          <p className="mt-0.5 text-muted-foreground">
            {formatTimelineDate(event.date_value, event.is_relative)}
          </p>
          {event.involved_parties.length > 0 && (
            <p className="mt-1 text-[10px] text-muted-foreground truncate">
              {event.involved_parties.join(", ")}
            </p>
          )}
          {caseId && event.source_document_id && (
            <p className="mt-1 text-[10px] text-primary">Click to view source →</p>
          )}
        </div>
      )}
    </div>
  )
}
