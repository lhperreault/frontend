"use client"

import { useState } from "react"
import type { TimelineEvent } from "@/lib/types/timeline-event"
import { TimelineDot } from "./timeline-dot"
import { formatTimelineDate } from "@/lib/utils/format-date"

interface TimelineStripProps {
  events: TimelineEvent[]
  /** When provided, clicking a dot navigates to that event's source document */
  caseId?: string
}

export function TimelineStrip({ events, caseId }: TimelineStripProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  if (!events.length) {
    return (
      <div className="flex h-full items-center px-4">
        <p className="text-xs text-muted-foreground">No timeline events yet.</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full items-center overflow-x-auto px-4">
      {/* Axis line */}
      <div className="absolute left-0 right-0 top-1/2 h-px bg-border/50" />

      {/* Events */}
      <div className="relative flex items-center gap-8 py-2">
        {events.map((event) => (
          <div key={event.node_id} className="flex flex-col items-center gap-1">
            <TimelineDot
              event={event}
              isActive={activeId === event.node_id}
              caseId={caseId}
              onClick={(e) => setActiveId(activeId === e.node_id ? null : e.node_id)}
            />
            <span className="whitespace-nowrap text-[9px] text-muted-foreground">
              {formatTimelineDate(event.date_value, event.is_relative)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
