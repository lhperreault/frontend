"use client"

import { useParams } from "next/navigation"
import { useState, useEffect, useRef } from "react"
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

const STAGE_OPTIONS: Array<{ value: NonNullable<Case["case_stage"]>; label: string }> = [
  { value: "filing",    label: "Filing" },
  { value: "discovery", label: "Discovery" },
  { value: "motions",   label: "Motions" },
  { value: "trial",     label: "Trial" },
  { value: "appeal",    label: "Appeal" },
  { value: "closed",    label: "Closed" },
]

// Priority order — higher index = later in lifecycle
const STAGE_ORDER: Record<string, number> = {
  filing: 0, discovery: 1, motions: 2, trial: 3, appeal: 4, closed: 5,
}

/**
 * Infer the furthest litigation stage from a list of document types.
 * Priority: appeal > trial > motions > discovery > filing
 */
function inferStageFromDocs(docTypes: (string | null)[]): Case["case_stage"] | null {
  const types = docTypes.filter(Boolean) as string[]
  if (types.some(t => t.includes("Appeal Brief") || t.includes("Notice of Appeal"))) return "appeal"
  if (types.some(t =>
    t.startsWith("Court - Trial") ||
    t.startsWith("Court - Pretrial") ||
    t.startsWith("Court - Jury")
  )) return "trial"
  if (types.some(t =>
    t.startsWith("Pleading - Motion") ||
    t.startsWith("Pleading - Brief") ||
    t.startsWith("Pleading - Opposition") ||
    t.startsWith("Pleading - Reply Brief")
  )) return "motions"
  if (types.some(t => t.startsWith("Discovery"))) return "discovery"
  if (types.some(t => t.startsWith("Pleading"))) return "filing"
  return null
}

/**
 * Case Pulse — thin glassmorphism top bar.
 * Reads caseId from the URL directly (via useParams) so it works even though
 * it renders outside the CaseProvider (which only wraps at case/[caseId]/**).
 *
 * Auto-detects litigation stage from uploaded documents and advances it
 * forward automatically. The stage badge is also manually editable via a
 * hover → click → dropdown flow.
 */
export function CasePulse() {
  const params = useParams()
  const caseId = typeof params?.caseId === "string" ? params.caseId : null

  const [caseData, setCaseData] = useState<Case | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [stageOpen, setStageOpen] = useState(false)
  const [stageHover, setStageHover] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!caseId) return
    setIsLoading(true)

    Promise.all([
      fetch(`/api/case/${caseId}/metadata`).then(r => r.ok ? r.json() as Promise<Case> : null),
      fetch(`/api/case/${caseId}/documents`).then(r => r.ok ? r.json() as Promise<Array<{ document_type: string | null }>> : []),
    ])
      .then(async ([caseRow, docs]) => {
        if (!caseRow) return

        const inferredStage = inferStageFromDocs((docs ?? []).map(d => d.document_type))

        // Auto-advance stage only forward in the lifecycle — never overwrite a
        // manually set "later" stage or a "closed" case.
        if (inferredStage) {
          const storedOrder   = STAGE_ORDER[caseRow.case_stage ?? ""] ?? -1
          const inferredOrder = STAGE_ORDER[inferredStage] ?? -1
          if (inferredOrder > storedOrder) {
            const patchRes = await fetch(`/api/case/${caseId}/metadata`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ case_stage: inferredStage }),
            })
            if (patchRes.ok) {
              setCaseData({ ...caseRow, case_stage: inferredStage })
              return
            }
          }
        }

        setCaseData(caseRow)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [caseId])

  // Close dropdown on outside click
  useEffect(() => {
    if (!stageOpen) return
    function handler(e: MouseEvent) {
      if (stageRef.current && !stageRef.current.contains(e.target as Node)) {
        setStageOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [stageOpen])

  async function updateStage(newStage: Case["case_stage"]) {
    if (!caseId || !caseData) return
    setStageOpen(false)
    const res = await fetch(`/api/case/${caseId}/metadata`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_stage: newStage }),
    })
    if (res.ok) {
      setCaseData(prev => prev ? { ...prev, case_stage: newStage } : prev)
    }
  }

  const caseLabel = !caseId
    ? "No case open"
    : isLoading
    ? "Loading…"
    : (caseData?.case_name ?? "No case open")

  const caseType  = caseData?.case_type ?? null
  const caseStage = caseData?.case_stage ?? null
  const partyRole = caseData?.party_role ?? null
  const deadline  = caseData?.next_deadline ?? null
  const status    = caseData?.pipeline_status ?? "idle"

  const ROLE_LABEL: Record<string, string> = {
    plaintiff: "Plaintiff",
    defendant: "Defendant",
    appellant: "Appellant",
    appellee:  "Appellee",
  }

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

      {/* Left: case name + editable stage badge + party role */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium truncate">{caseLabel}</span>

        {/* Editable stage badge — only render when inside a case */}
        {caseId && (
          <div className="relative shrink-0" ref={stageRef}>
            <button
              type="button"
              onMouseEnter={() => setStageHover(true)}
              onMouseLeave={() => setStageHover(false)}
              onClick={() => setStageOpen(o => !o)}
              className={cn(
                "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize transition-colors",
                caseStage
                  ? "bg-purple-500/15 text-purple-400 hover:bg-purple-500/25"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
              )}
            >
              {stageHover && !stageOpen ? (
                <span>Edit stage</span>
              ) : (
                <span>{caseStage ?? "Set stage"}</span>
              )}
              <svg className="h-2.5 w-2.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {stageOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 w-32 rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm shadow-lg py-1">
                {STAGE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateStage(opt.value)}
                    className={cn(
                      "w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted/60",
                      caseStage === opt.value
                        ? "text-purple-400 font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {partyRole && (
          <span className="shrink-0 rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium capitalize text-purple-300">
            {ROLE_LABEL[partyRole] ?? partyRole}
          </span>
        )}
      </div>

      {/* Center: case type */}
      <div className="flex-1 text-center">
        <span className="text-xs text-muted-foreground">{caseType ?? "—"}</span>
      </div>

      {/* Right: pending docs + notifications + deadline + pipeline status */}
      <div className="flex items-center gap-3 shrink-0">
        {caseId && <PendingDocsBadge caseId={caseId} />}
        <NotificationBell />
        {deadline && <DeadlineCountdown deadline={deadline} />}
        <span
          className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[status] ?? STATUS_DOT.idle)}
          title={`Pipeline: ${status}`}
        />
      </div>
    </header>
  )
}

/** Badge showing N pending documents for the current case */
function PendingDocsBadge({ caseId }: { caseId: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/intake/queue?status=processing&limit=1`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        setCount(data.total ?? 0)
      } catch { /* ignore */ }
    }
    load()

    // Also check confirmed + pending
    async function loadAll() {
      try {
        const res = await fetch(`/api/intake/queue?limit=1`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        const active = (data.items ?? []).filter(
          (i: { status: string }) => !["completed", "cancelled", "failed"].includes(i.status)
        )
        setCount(active.length)
      } catch { /* ignore */ }
    }
    loadAll()

    return () => { cancelled = true }
  }, [caseId])

  if (count === 0) return null

  return (
    <Link
      href="/intake"
      className="flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 hover:bg-amber-500/25 transition-colors"
      title={`${count} document${count === 1 ? "" : "s"} pending processing`}
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {count} pending
    </Link>
  )
}

/** Notification bell with unread count */
function NotificationBell() {
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Array<{
    id: string
    event_type: string
    payload: { message?: string }
    created_at: string
    read: boolean
  }>>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/notifications?unread_only=true&limit=10")
        if (!res.ok || cancelled) return
        const data = await res.json()
        const items = data.notifications ?? []
        setNotifications(items)
        setUnread(items.length)
      } catch { /* ignore */ }
    }
    load()
    const timer = setInterval(load, 30_000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" })
    setNotifications(prev => prev.filter(n => n.id !== id))
    setUnread(prev => Math.max(0, prev - 1))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="relative text-muted-foreground hover:text-foreground transition-colors p-0.5"
        title="Notifications"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm shadow-lg">
          <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
            <span className="text-xs font-medium">Notifications</span>
            {unread > 0 && (
              <span className="text-[10px] text-muted-foreground">{unread} unread</span>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                No new notifications
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markRead(n.id)}
                  className="w-full px-3 py-2 text-left hover:bg-muted/40 transition-colors border-b border-border/20 last:border-0"
                >
                  <p className="text-xs text-foreground line-clamp-2">
                    {n.payload?.message ?? n.event_type}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
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
