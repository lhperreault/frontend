"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface IntakeItem {
  id: string
  firm_id: string
  source_channel: string
  file_name: string
  status: string
  process_priority: string
  processing_mode: string
  routing_result: {
    suggested_case_id?: string
    confidence?: number
    method?: string
    reasoning?: string
    candidates?: Array<{ id: string; name: string }>
    needs_user_confirmation?: boolean
  } | null
  target_case_id: string | null
  target_corpus_id: string | null
  error_message: string | null
  created_at: string
  processed_at: string | null
}

interface CaseOption {
  id: string
  case_name: string
}

const STATUS_COLORS: Record<string, string> = {
  pending:                "bg-gray-500/15 text-gray-400",
  routing:                "bg-blue-500/15 text-blue-400",
  awaiting_confirmation:  "bg-amber-500/15 text-amber-400",
  confirmed:              "bg-cyan-500/15 text-cyan-400",
  scheduled:              "bg-indigo-500/15 text-indigo-400",
  processing:             "bg-purple-500/15 text-purple-400 animate-pulse",
  completed:              "bg-emerald-500/15 text-emerald-400",
  failed:                 "bg-red-500/15 text-red-400",
  cancelled:              "bg-gray-500/10 text-gray-500",
}

const PRIORITY_COLORS: Record<string, string> = {
  immediate: "bg-red-500/15 text-red-400",
  soon:      "bg-amber-500/15 text-amber-400",
  overnight: "bg-blue-500/15 text-blue-400",
  manual:    "bg-gray-500/15 text-gray-400",
}

const CHANNEL_ICONS: Record<string, string> = {
  upload:      "Upload",
  email:       "Email",
  gdrive:      "Drive",
  dropbox:     "Dropbox",
  cms_webhook: "CMS",
}

export default function IntakeQueuePage() {
  const [items, setItems] = useState<IntakeItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)
  const [cases, setCases] = useState<CaseOption[]>([])

  const loadQueue = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: "50" })
    if (filter) params.set("status", filter)

    const res = await fetch(`/api/intake/queue?${params}`)
    if (res.ok) {
      const data = await res.json()
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
    }
    setLoading(false)
  }, [filter])

  useEffect(() => { loadQueue() }, [loadQueue])

  // Load cases for the reassign dropdown
  useEffect(() => {
    fetch("/api/cases")
      .then(r => r.ok ? r.json() : [])
      .then(data => setCases(Array.isArray(data) ? data : data.cases ?? []))
      .catch(() => {})
  }, [])

  async function confirmItem(id: string, caseId: string) {
    await fetch(`/api/intake/queue/${id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: caseId }),
    })
    loadQueue()
  }

  async function reassignItem(id: string, caseId: string) {
    await fetch(`/api/intake/queue/${id}/reassign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: caseId }),
    })
    loadQueue()
  }

  const awaitingCount = items.filter(i => i.status === "awaiting_confirmation").length

  const FILTER_TABS = [
    { label: "All",      value: null },
    { label: "Needs Review", value: "awaiting_confirmation" },
    { label: "Processing",   value: "processing" },
    { label: "Completed",    value: "completed" },
    { label: "Failed",       value: "failed" },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Intake Queue</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total} document{total === 1 ? "" : "s"} in queue
              {awaitingCount > 0 && (
                <span className="text-amber-400 ml-2">
                  {awaitingCount} need{awaitingCount === 1 ? "s" : ""} review
                </span>
              )}
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">Back to Dashboard</Button>
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mt-3">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.label}
              onClick={() => setFilter(tab.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs transition-colors",
                filter === tab.value
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/40"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <p className="text-sm">No items in queue</p>
            <p className="text-xs mt-1">Upload documents or forward emails to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {items.map(item => (
              <IntakeRow
                key={item.id}
                item={item}
                cases={cases}
                onConfirm={confirmItem}
                onReassign={reassignItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function IntakeRow({
  item,
  cases,
  onConfirm,
  onReassign,
}: {
  item: IntakeItem
  cases: CaseOption[]
  onConfirm: (id: string, caseId: string) => void
  onReassign: (id: string, caseId: string) => void
}) {
  const [reassignOpen, setReassignOpen] = useState(false)
  const routing = item.routing_result
  const suggestedCase = cases.find(c => c.id === routing?.suggested_case_id)

  return (
    <div className="px-6 py-3 hover:bg-muted/20 transition-colors">
      <div className="flex items-start gap-3">
        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">
              {item.file_name?.replace(/_[0-9a-f]{8}\./, ".") ?? "Unknown file"}
            </span>
            <Badge variant="outline" className={cn("text-[10px] shrink-0", STATUS_COLORS[item.status])}>
              {item.status.replace(/_/g, " ")}
            </Badge>
            <Badge variant="outline" className={cn("text-[10px] shrink-0", PRIORITY_COLORS[item.process_priority])}>
              {item.process_priority}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
            <span>{CHANNEL_ICONS[item.source_channel] ?? item.source_channel}</span>
            <span>-</span>
            <span>{new Date(item.created_at).toLocaleString()}</span>
            {routing?.method && (
              <>
                <span>-</span>
                <span>Routed via {routing.method} ({Math.round((routing.confidence ?? 0) * 100)}%)</span>
              </>
            )}
          </div>

          {/* Routing reasoning */}
          {routing?.reasoning && item.status === "awaiting_confirmation" && (
            <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-1">
              {routing.reasoning}
            </p>
          )}

          {/* Error message */}
          {item.error_message && (
            <p className="text-xs text-red-400 mt-1 line-clamp-1">
              {item.error_message}
            </p>
          )}
        </div>

        {/* Actions for awaiting_confirmation */}
        {item.status === "awaiting_confirmation" && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Confirm suggested case */}
            {suggestedCase && (
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs"
                onClick={() => onConfirm(item.id, suggestedCase.id)}
              >
                Confirm: {suggestedCase.case_name.slice(0, 25)}
              </Button>
            )}

            {/* Reassign to different case */}
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setReassignOpen(o => !o)}
              >
                {suggestedCase ? "Change" : "Assign Case"}
              </Button>

              {reassignOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-56 max-h-48 overflow-y-auto rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm shadow-lg py-1">
                  {cases.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onReassign(item.id, c.id)
                        setReassignOpen(false)
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-muted/60 transition-colors truncate"
                    >
                      {c.case_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
