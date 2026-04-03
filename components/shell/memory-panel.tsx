"use client"

import { useEffect, useState } from "react"
import { Trash2, RefreshCw, Brain, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Session {
  session_id:    string
  message_count: number
  first_query:   string
  last_active:   string | null
}

interface MemoryPanelProps {
  caseId:           string
  activeSessionId?: string
  onSessionCleared?: (sessionId: string) => void
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—"
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return "just now"
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function MemoryPanel({ caseId, activeSessionId, onSessionCleared }: MemoryPanelProps) {
  const [sessions, setSessions]       = useState<Session[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [clearing, setClearing]       = useState<string | null>(null)
  const [clearedIds, setClearedIds]   = useState<Set<string>>(new Set())

  async function load() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/case/${caseId}/sessions`)
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions ?? [])
      }
    } catch {
      /* non-fatal */
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [caseId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function clearSession(sessionId: string) {
    setClearing(sessionId)
    try {
      const res = await fetch(`/api/case/${caseId}/sessions/${sessionId}`, { method: "DELETE" })
      if (res.ok) {
        setClearedIds(prev => new Set([...prev, sessionId]))
        onSessionCleared?.(sessionId)
      }
    } catch {
      /* non-fatal */
    } finally {
      setClearing(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/30" />
        ))}
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
        <Brain className="h-6 w-6 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">No conversation sessions yet.</p>
        <p className="text-[10px] text-muted-foreground/60">
          Start a chat — sessions appear here once you've sent a message.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {/* Header */}
      <div className="mb-1 flex items-center justify-between px-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Conversation memory
        </p>
        <button
          type="button"
          onClick={load}
          className="rounded p-1 text-muted-foreground/50 hover:text-muted-foreground"
          title="Refresh"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      {/* Explainer */}
      <div className="mb-2 flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/15 px-2.5 py-2">
        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
        <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
          Resetting memory clears what the AI remembers in that thread.
          Your conversation history (audit log) is always preserved.
        </p>
      </div>

      {/* Session list */}
      {sessions.map((s) => {
        const isActive  = s.session_id === activeSessionId
        const isCleared = clearedIds.has(s.session_id)
        const isWorking = clearing === s.session_id

        return (
          <div
            key={s.session_id}
            className={cn(
              "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors",
              isActive
                ? "border-primary/20 bg-primary/5"
                : "border-border/30 bg-muted/20",
              isCleared && "opacity-50"
            )}
          >
            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground/80">
                {s.first_query || "(no messages yet)"}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {s.message_count} {s.message_count === 1 ? "turn" : "turns"}
                {" · "}
                {relativeTime(s.last_active)}
                {isActive && (
                  <span className="ml-1.5 rounded bg-primary/15 px-1 py-0.5 text-[9px] font-medium text-primary">
                    active
                  </span>
                )}
                {isCleared && (
                  <span className="ml-1.5 text-[9px] text-amber-400">memory cleared</span>
                )}
              </p>
            </div>

            {/* Reset button */}
            {!isCleared && (
              <button
                type="button"
                disabled={isWorking}
                onClick={() => clearSession(s.session_id)}
                title="Reset memory for this session"
                className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground/40 transition-colors hover:text-red-400 disabled:opacity-40"
              >
                {isWorking ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
