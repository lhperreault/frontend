"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Plus, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { NewCaseModal } from "./new-case-modal"
import type { Case } from "@/lib/types/case"

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

  async function load() {
    const supabase = createClient()
    const { data: caseRows } = await supabase
      .from("cases")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6)

    if (!caseRows?.length) { setIsLoading(false); return }
    setCases(caseRows as Case[])

    const ids = caseRows.map((c) => c.id)
    const { data: docs } = await supabase
      .from("documents")
      .select("case_id")
      .in("case_id", ids)

    const counts: Record<string, number> = {}
    for (const d of docs ?? []) {
      counts[d.case_id] = (counts[d.case_id] ?? 0) + 1
    }
    setDocCounts(counts)
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
    const supabase = createClient()
    await supabase.from("cases").delete().eq("id", deleteTarget.id)
    setCases((prev) => prev.filter((c) => c.id !== deleteTarget.id))
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
                  {c.case_stage && (
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${stageCls}`}>
                      {c.case_stage}
                    </span>
                  )}
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
