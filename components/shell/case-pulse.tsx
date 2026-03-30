"use client"

import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import type { Case } from "@/lib/types/case"
import { cn } from "@/lib/utils"

/** Pipeline status dot colors */
const STATUS_DOT: Record<string, string> = {
  ready:   "bg-emerald-400",
  running: "bg-amber-400 animate-pulse",
  error:   "bg-red-400",
  idle:    "bg-muted-foreground",
}

/**
 * Case Pulse — thin glassmorphism top bar.
 * Reads caseId from the URL directly (via useParams) so it works even though
 * it renders outside the CaseProvider (which only wraps at case/[caseId]/**).
 */
export function CasePulse() {
  const params = useParams()
  const caseId = typeof params?.caseId === "string" ? params.caseId : null

  const [caseData, setCaseData] = useState<Case | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!caseId) return
    setIsLoading(true)
    fetch(`/api/case/${caseId}/metadata`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Case | null) => { if (data) setCaseData(data) })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [caseId])

  const caseLabel = !caseId
    ? "No case open"
    : isLoading
    ? "Loading…"
    : (caseData?.case_name ?? "No case open")

  const caseType = caseData?.case_type ?? null
  const deadline = caseData?.next_deadline ?? null
  const status   = caseData?.pipeline_status ?? "idle"

  return (
    <header className="glass border-b border-border/50 h-11 flex items-center px-4 gap-4 shrink-0 z-40">
      {/* Logo / Home link */}
      <Link
        href="/dashboard"
        className="shrink-0 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        title="Dashboard"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      </Link>

      {/* Left: case name */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium truncate">{caseLabel}</span>
      </div>

      {/* Center: case type */}
      <div className="flex-1 text-center">
        <span className="text-xs text-muted-foreground">{caseType ?? "—"}</span>
      </div>

      {/* Right: deadline + pipeline status */}
      <div className="flex items-center gap-3 shrink-0">
        {deadline && <DeadlineCountdown deadline={deadline} />}
        <span
          className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[status] ?? STATUS_DOT.idle)}
          title={`Pipeline: ${status}`}
        />
      </div>
    </header>
  )
}

function DeadlineCountdown({ deadline }: { deadline: string }) {
  const target = new Date(deadline)
  const now    = new Date()
  const diffMs = target.getTime() - now.getTime()

  if (isNaN(target.getTime())) return null

  if (diffMs <= 0) {
    return <span className="text-xs text-destructive font-medium">OVERDUE</span>
  }

  const days  = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {days > 0 ? `${days}d ` : ""}{hours}h to deadline
    </span>
  )
}
