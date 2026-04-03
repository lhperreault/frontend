"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Plus, Trash2 } from "lucide-react"
import { NewCaseModal } from "./new-case-modal"
import type { Case } from "@/lib/types/case"
import { cn } from "@/lib/utils"

const STAGE_OPTIONS: Array<{ value: NonNullable<Case["case_stage"]>; label: string }> = [
  { value: "filing",    label: "Filing" },
  { value: "discovery", label: "Discovery" },
  { value: "motions",   label: "Motions" },
  { value: "trial",     label: "Trial" },
  { value: "appeal",    label: "Appeal" },
  { value: "closed",    label: "Closed" },
]

// ── Display helpers ───────────────────────────────────────────────────────────

function relativeDate(dateStr: string | null): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ""
  const diff = d.getTime() - Date.now()
  const days = Math.round(diff / 86_400_000)
  if (days === 0) return "today"
  if (days === 1) return "tomorrow"
  if (days > 0) return `in ${days}d`
  return `${Math.abs(days)}d ago`
}

const STATUS_DOT: Record<string, string> = {
  ready:   "bg-emerald-400",
  running: "bg-amber-400 animate-pulse",
  error:   "bg-red-400",
  idle:    "bg-muted-foreground/50",
}

const STAGE_STYLE: Record<string, string> = {
  filing:    "bg-blue-500/10 text-blue-400",
  discovery: "bg-amber-500/10 text-amber-400",
  motions:   "bg-purple-500/10 text-purple-400",
  trial:     "bg-red-500/10 text-red-400",
  appeal:    "bg-orange-500/10 text-orange-400",
  closed:    "bg-muted/60 text-muted-foreground",
}

const ROLE_LABEL: Record<string, string> = {
  plaintiff: "Plaintiff",
  defendant: "Defendant",
  appellant: "Appellant",
  appellee:  "Appellee",
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RecentCases() {
  const [cases, setCases]       = useState<Case[]>([])
  const [docCounts, setDocCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Case | null>(null)
  const [deleteInput, setDeleteInput]   = useState("")
  const [isDeleting, setIsDeleting]     = useState(false)
  const deleteInputRef = useRef<HTMLInputElement>(null)
  const [openStageId, setOpenStageId]   = useState<string | null>(null)
  const [hoverStageId, setHoverStageId] = useState<string | null>(null)
  const stageDropdownRef = useRef<HTMLDivElement>(null)

  // Close stage dropdown on outside click
  useEffect(() => {
    if (!openStageId) return
    function handler(e: MouseEvent) {
      if (stageDropdownRef.current && !stageDropdownRef.current.contains(e.target as Node)) {
        setOpenStageId(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [openStageId])

  async function updateCaseStage(caseId: string, newStage: Case["case_stage"]) {
    setOpenStageId(null)
    const res = await fetch(`/api/case/${caseId}/metadata`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_stage: newStage }),
    })
    if (res.ok) {
      setCases(prev => prev.map(c => c.id === caseId ? { ...c, case_stage: newStage } : c))
    }
  }

  async function load() {
    const res = await fetch("/api/cases")
    if (!res.ok) { setIsLoading(false); return }
    const { cases: caseRows, docCounts: counts } = await res.json()
    setCases(((caseRows ?? []) as Case[]).slice(0, 6))
    setDocCounts(counts ?? {})
    setIsLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function openDeleteModal(e: React.MouseEvent, c: Case) {
    e.preventDefault()
    e.stopPropagation()
    setDeleteTarget(c)
    setDeleteInput("")
    setTimeout(() => deleteInputRef.current?.focus(), 50)
  }

  function closeDeleteModal() {
    setDeleteTarget(null)
    setDeleteInput("")
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteInput !== deleteTarget.case_name) return
    setIsDeleting(true)
    const res = await fetch(`/api/case/${deleteTarget.id}`, { method: "DELETE" })
    if (res.ok) {
      setCases((prev) => prev.filter((c) => c.id !== deleteTarget.id))
    }
    setIsDeleting(false)
    closeDeleteModal()
  }

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recent cases
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-transparent px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          New case
        </button>
      </div>

      {/* Cases grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass h-32 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : cases.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-3 rounded-xl py-10 text-center">
          <p className="text-sm text-muted-foreground">No cases yet.</p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Create your first case
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => {
            const dotCls   = STATUS_DOT[c.pipeline_status ?? "idle"] ?? STATUS_DOT.idle
            const stageCls = c.case_stage ? (STAGE_STYLE[c.case_stage] ?? "") : ""
            const count    = docCounts[c.id] ?? 0

            return (
              <Link
                key={c.id}
                href={`/case/${c.id}/workspace`}
                className="glass group flex flex-col gap-2 rounded-xl p-4 transition-colors hover:border-border"
              >
                {/* Name + status dot + delete */}
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate text-sm font-medium group-hover:text-primary">
                    {c.case_name}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={`mt-1 h-2 w-2 rounded-full ${dotCls}`}
                      title={`Pipeline: ${c.pipeline_status ?? "idle"}`}
                    />
                    <button
                      type="button"
                      onClick={(e) => openDeleteModal(e, c)}
                      className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                      title="Delete case"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stage + role badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Editable stage badge */}
                  <div
                    className="relative"
                    ref={openStageId === c.id ? stageDropdownRef : undefined}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setHoverStageId(c.id)}
                      onMouseLeave={() => setHoverStageId(null)}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setOpenStageId(prev => prev === c.id ? null : c.id)
                      }}
                      className={cn(
                        "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize transition-colors",
                        c.case_stage
                          ? `${stageCls} hover:opacity-80`
                          : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                      )}
                    >
                      {hoverStageId === c.id && openStageId !== c.id ? (
                        <span>Edit</span>
                      ) : (
                        <span>{c.case_stage ?? "Stage"}</span>
                      )}
                      <svg className="h-2.5 w-2.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>

                    {openStageId === c.id && (
                      <div className="absolute left-0 top-full mt-1 z-50 w-32 rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm shadow-lg py-1">
                        {STAGE_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              updateCaseStage(c.id, opt.value)
                            }}
                            className={cn(
                              "w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted/60",
                              c.case_stage === opt.value
                                ? "text-foreground font-medium"
                                : "text-muted-foreground"
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {c.party_role && (
                    <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {ROLE_LABEL[c.party_role] ?? c.party_role}
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                  <span>{count} doc{count !== 1 ? "s" : ""}</span>
                  {c.next_deadline && (
                    <span>Due {relativeDate(c.next_deadline)}</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* New Case modal */}
      <NewCaseModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={(caseId) => {
          setModalOpen(false)
          // Reload cases list so the new one appears immediately
          load()
          // Navigate to the new case
          window.location.href = `/case/${caseId}/workspace`
        }}
      />

      {/* Delete case modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeDeleteModal}
        >
          <div
            className="glass w-full max-w-sm rounded-xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-sm font-semibold text-foreground">Delete case</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              This will permanently delete{" "}
              <span className="font-medium text-foreground">{deleteTarget.case_name}</span>{" "}
              and all associated documents and data. Type the case name to confirm.
            </p>

            <input
              ref={deleteInputRef}
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmDelete() }}
              placeholder={deleteTarget.case_name}
              className="mb-4 w-full rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-red-400/60 focus:outline-none"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-lg border border-border/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteInput !== deleteTarget.case_name || isDeleting}
                className="rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDeleting ? "Deleting…" : "Delete case"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
