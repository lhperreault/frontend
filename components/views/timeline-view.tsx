"use client"

import { useMemo, useState } from "react"
import { useWorkspace } from "@/providers/workspace-provider"
import { useTimeline } from "@/hooks/use-timeline"
import { TimeTravelFilter } from "@/components/chronology/time-travel-filter"
import { TimelineStrip } from "@/components/chronology/timeline-strip"
import { formatTimelineDate } from "@/lib/utils/format-date"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { TimelineEvent } from "@/lib/types/timeline-event"

const EVENT_COLORS = {
  event:            { dot: "#34d399", badge: "bg-emerald-500/10 text-emerald-600", label: "Event" },
  procedural_event: { dot: "#c084fc", badge: "bg-purple-500/10 text-purple-600",  label: "Filing" },
} as const

export function TimelineView({ caseId }: { caseId: string }) {
  const { activeDocumentId, navigateToDocument } = useWorkspace()
  const { events, timeTravelDate, filterToDate, isLoading } = useTimeline(caseId)

  const [partyFilter, setPartyFilter] = useState("")
  // Toggle: "case" = all events, "doc" = only events from the active document
  const [scope, setScope] = useState<"case" | "doc">("case")

  const allParties = useMemo(
    () => Array.from(new Set(events.flatMap(e => e.involved_parties))).sort(),
    [events]
  )

  const displayed = useMemo(() => {
    let list = events
    if (partyFilter) {
      list = list.filter(e =>
        e.involved_parties.some(p => p.toLowerCase().includes(partyFilter.toLowerCase()))
      )
    }
    if (scope === "doc" && activeDocumentId) {
      list = list.filter(e => e.source_document_id === activeDocumentId)
    }
    return list
  }, [events, partyFilter, scope, activeDocumentId])

  const handleRowClick = (event: TimelineEvent) => {
    if (!event.source_document_id) return
    navigateToDocument(event.source_document_id, event.source_section_id ?? undefined)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header bar */}
      <div className="shrink-0 border-b border-border/30 px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Scope toggle */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border/40 text-[10px]">
              <button
                onClick={() => setScope("case")}
                className={cn(
                  "rounded-l-md px-2.5 py-1 transition-colors",
                  scope === "case"
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/20"
                )}
              >
                Full case
              </button>
              <button
                onClick={() => setScope("doc")}
                disabled={!activeDocumentId}
                className={cn(
                  "rounded-r-md px-2.5 py-1 transition-colors disabled:opacity-40",
                  scope === "doc"
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/20"
                )}
              >
                This doc
              </button>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {displayed.length} event{displayed.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <select
              value={partyFilter}
              onChange={e => setPartyFilter(e.target.value)}
              className="rounded border border-border/40 bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All parties</option>
              {allParties.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <TimeTravelFilter value={timeTravelDate} onChange={filterToDate} />
          </div>
        </div>
      </div>

      {/* Mini strip */}
      <div className="h-16 shrink-0 border-b border-border/20 bg-muted/5">
        {isLoading ? (
          <div className="flex h-full items-center px-4">
            <p className="animate-pulse text-xs text-muted-foreground">Loading…</p>
          </div>
        ) : (
          <TimelineStrip events={displayed} caseId={caseId} />
        )}
      </div>

      {/* Event table */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/30" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {scope === "doc" && !activeDocumentId
              ? "Open a document to see its timeline."
              : "No events match the current filter."}
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 border-b border-border/30 bg-background">
              <tr>
                {[
                  ["Date",    "w-28"],
                  ["Event",   ""],
                  ["Type",    "w-24 hidden md:table-cell"],
                  ["Parties", "hidden lg:table-cell"],
                  ["Conf",    "w-16 text-right hidden sm:table-cell"],
                ].map(([label, cls]) => (
                  <th
                    key={label}
                    className={cn(
                      "px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
                      cls,
                      label === "Conf" && "text-right",
                    )}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(event => {
                const typeInfo = EVENT_COLORS[event.event_type as keyof typeof EVENT_COLORS] ?? {
                  dot: "#6b7280", badge: "bg-muted text-muted-foreground", label: event.event_type,
                }
                const canNav = !!event.source_document_id
                return (
                  <tr
                    key={event.node_id}
                    onClick={() => handleRowClick(event)}
                    className={cn(
                      "border-b border-border/20 transition-colors",
                      canNav ? "cursor-pointer hover:bg-muted/30" : "opacity-60",
                    )}
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                      {formatTimelineDate(event.date_value, event.is_relative)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: typeInfo.dot }} />
                        <span className="font-medium">{event.event_label}</span>
                      </div>
                    </td>
                    <td className="hidden px-3 py-2.5 md:table-cell">
                      <Badge variant="secondary" className={cn("text-[10px]", typeInfo.badge)}>
                        {typeInfo.label}
                      </Badge>
                    </td>
                    <td className="hidden px-3 py-2.5 text-muted-foreground lg:table-cell">
                      {event.involved_parties.slice(0, 2).join(", ")}
                      {event.involved_parties.length > 2 && (
                        <span className="text-muted-foreground/50"> +{event.involved_parties.length - 2}</span>
                      )}
                    </td>
                    <td className="hidden px-3 py-2.5 text-right sm:table-cell">
                      <span className={cn(
                        "tabular-nums",
                        event.confidence >= 0.85 ? "text-emerald-500" : event.confidence >= 0.7 ? "text-amber-500" : "text-slate-400"
                      )}>
                        {(event.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
