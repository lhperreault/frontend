"use client"

import { useState } from "react"
import Link from "next/link"
import { useTimeline } from "@/hooks/use-timeline"
import { TimelineStrip } from "./timeline-strip"
import { TimeTravelFilter } from "./time-travel-filter"
import { motion, AnimatePresence } from "framer-motion"

interface ChronologyDrawerProps {
  caseId: string
}

const EXPANDED_HEIGHT = 200

export function ChronologyDrawer({ caseId }: ChronologyDrawerProps) {
  const { events, timeTravelDate, filterToDate, isLoading } = useTimeline(caseId)
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="relative shrink-0 border-t border-border/30">
      {/* Handle bar — always visible, 48px tall */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex h-12 w-full items-center justify-between px-4 transition-colors hover:bg-muted/20"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Chronology
          {!isLoading && events.length > 0 && (
            <span className="ml-1.5 font-normal text-muted-foreground/60">
              · {events.length} events
            </span>
          )}
        </span>
        <span className="text-[10px] text-muted-foreground/50">
          {expanded ? "▼" : "▲"}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="drawer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: EXPANDED_HEIGHT, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="overflow-hidden border-t border-border/20"
          >
            <div className="flex h-full flex-col">
              {/* Controls row */}
              <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2">
                <TimeTravelFilter value={timeTravelDate} onChange={filterToDate} />
                <Link
                  href={`/case/${caseId}/timeline`}
                  className="shrink-0 text-xs text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View full timeline →
                </Link>
              </div>

              {/* Timeline strip */}
              <div className="flex-1 overflow-hidden">
                {isLoading ? (
                  <div className="flex h-full items-center px-4">
                    <p className="animate-pulse text-xs text-muted-foreground">Loading timeline…</p>
                  </div>
                ) : (
                  <TimelineStrip events={events} caseId={caseId} />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
