"use client"

import { use, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useTimeline } from "@/hooks/use-timeline"
import { TimeTravelFilter } from "@/components/chronology/time-travel-filter"
import { TimelineStrip } from "@/components/chronology/timeline-strip"
import { formatTimelineDate } from "@/lib/utils/format-date"
import { Badge } from "@/components/ui/badge"
import type { TimelineEvent } from "@/lib/types/timeline-event"
import { cn } from "@/lib/utils"

const EVENT_COLORS = {
  event:            { dot: "#34d399", badge: "bg-emerald-500/10 text-emerald-600", label: "Event" },
  procedural_event: { dot: "#c084fc", badge: "bg-purple-500/10 text-purple-600",  label: "Filing" },
} as const

export default function TimelinePage({
  params,
}: {
  params: Promise<{ caseId: string }>
}) {
  const { caseId } = use(params)
  const router = useRouter()
  const { events, timeTravelDate, filterToDate, isLoading } = useTimeline(caseId)

  // Party filter — client-side so the dropdown stays populated while filtering
  const [partyFilter, setPartyFilter] = useState("")

  const allParties = useMemo(
    () => Array.from(new Set(events.flatMap((e) => e.involved_parties))).sort(),
    [events],
  )

  const displayed = useMemo(() => {
    if (!partyFilter) return events
    return events.filter((e) =>
      e.involved_parties.some((p) =>
        p.toLowerCase().includes(partyFilter.toLowerCase()),
      ),
    )
  }, [events, partyFilter])

  const handleRowClick = (event: TimelineEvent) => {
    if (!event.source_document_id) return
    const p = new URLSearchParams({ doc: event.source_document_id })
    if (event.source_section_id) p.set("section", event.source_section_id)
    router.push(`/case/${caseId}/workspace?${p.toString()}`)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border/30 px-6 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Chronology</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {displayed.length} event{displayed.length !== 1 ? "s" : ""}
              {partyFilter ? ` · filtered by "${partyFilter}"` : " · all documents"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Party dropdown */}
            <select
              value={partyFilter}
              onChange={(e) => setPartyFilter(e.target.value)}
              className="rounded-lg border border-border/50 bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All parties</option>
              {allParties.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {/* Time-travel */}
            <TimeTravelFilter value={timeTravelDate} onChange={filterToDate} />
          </div>
        </div>
      </div>

      {/* Horizontal mini-strip */}
      <div className="h-20 shrink-0 border-b border-border/20 bg-muted/5">
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
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass h-14 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No events match the current filter.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-border/30 bg-background">
              <tr>
                {[
                  ["Date",       "w-36"],
                  ["Event",      ""],
                  ["Type",       "w-28 hidden md:table-cell"],
                  ["Parties",    "hidden lg:table-cell"],
                  ["Confidence", "w-24 text-right hidden sm:table-cell"],
                ].map(([label, cls]) => (
                  <th
                    key={label}
                    className={cn(
                      "px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                      cls,
                      label === "Confidence" && "text-right",
                    )}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((event) => {
                const typeInfo = EVENT_COLORS[event.event_type] ?? {
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
                    title={canNav ? "Click to view source section" : undefined}
                  >
                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimelineDate(event.date_value, event.is_relative)}
                    </td>

                    {/* Event label */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: typeInfo.dot }}
                        />
                        <span className="font-medium">{event.event_label}</span>
                      </div>
                    </td>

                    {/* Type badge */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant="secondary" className={cn("text-[10px]", typeInfo.badge)}>
                        {typeInfo.label}
                      </Badge>
                    </td>

                    {/* Parties */}
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                      {event.involved_parties.slice(0, 2).join(", ")}
                      {event.involved_parties.length > 2 && (
                        <span className="text-muted-foreground/50">
                          {" "}+{event.involved_parties.length - 2}
                        </span>
                      )}
                    </td>

                    {/* Confidence */}
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span
                        className={cn(
                          "tabular-nums text-xs",
                          event.confidence >= 0.85
                            ? "text-emerald-500"
                            : event.confidence >= 0.7
                            ? "text-amber-500"
                            : "text-slate-400",
                        )}
                      >
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
