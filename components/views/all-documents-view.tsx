"use client"

import { useState, useEffect, useMemo } from "react"
import { useWorkspace } from "@/providers/workspace-provider"
import { useEntities } from "@/hooks/use-entities"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Document } from "@/lib/types/case"

// ─── helpers ──────────────────────────────────────────────────────────────────

function groupDocuments(documents: Document[]) {
  const children = new Map<string, Document[]>()
  const topLevel: Document[] = []
  for (const doc of documents) {
    if (doc.parent_document_id) {
      const list = children.get(doc.parent_document_id) ?? []
      list.push(doc)
      children.set(doc.parent_document_id, list)
    } else {
      topLevel.push(doc)
    }
  }
  return { topLevel, children }
}

function confidenceColor(score: number | null): string {
  if (score == null) return "text-muted-foreground"
  if (score >= 0.85) return "text-emerald-500"
  if (score >= 0.7)  return "text-amber-500"
  return "text-slate-400"
}

// ─── DocRow ───────────────────────────────────────────────────────────────────

function DocRow({
  doc,
  childDocs,
  isChild = false,
  onDeleted,
  onView,
}: {
  doc: Document
  childDocs: Document[]
  isChild?: boolean
  onDeleted: (id: string) => void
  onView: (docId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirm, setConfirm]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/case/${doc.case_id}/documents/${doc.id}`, { method: "DELETE" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setDeleteError(body.error ?? `Delete failed (${res.status})`)
        setDeleting(false)
        return
      }
      onDeleted(doc.id)
    } catch {
      setDeleteError("Network error — could not delete document.")
      setDeleting(false)
    }
  }

  return (
    <>
      <tr className={cn("border-b border-border/30 transition-colors hover:bg-muted/30", isChild && "bg-muted/10")}>
        {/* Expand toggle */}
        <td className="w-6 px-3 py-2">
          {childDocs.length > 0 && (
            <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground/60 hover:text-muted-foreground">
              <svg className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </td>

        {/* File name */}
        <td className="min-w-0 px-2 py-2">
          <div className={cn("flex items-center gap-2", isChild && "pl-4")}>
            {isChild && (
              <span className="shrink-0 rounded border border-border/40 px-1 text-[9px] uppercase tracking-wide text-muted-foreground/60">
                exhibit
              </span>
            )}
            <span className="truncate text-xs font-medium text-foreground/90">{doc.file_name}</span>
          </div>
        </td>

        {/* Type badge */}
        <td className="hidden px-2 py-2 md:table-cell">
          {doc.document_type ? (
            <Badge variant="secondary" className="whitespace-nowrap text-[10px]">
              {doc.document_type}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>

        {/* Pages */}
        <td className="hidden px-2 py-2 text-xs tabular-nums text-muted-foreground sm:table-cell">
          {doc.total_pages ?? "—"}
        </td>

        {/* Confidence */}
        <td className="px-2 py-2">
          {doc.confidence_score != null ? (
            <span className={cn("text-xs tabular-nums font-mono", confidenceColor(doc.confidence_score))}>
              {(doc.confidence_score * 100).toFixed(0)}%
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>

        {/* Actions */}
        <td className="px-3 py-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onView(doc.id)}
                className="text-xs font-medium text-primary hover:underline"
              >
                View
              </button>
              {confirm ? (
                <span className="flex items-center gap-1.5">
                  <button type="button" onClick={handleDelete} disabled={deleting}
                    className="text-xs font-medium text-red-500 hover:text-red-400 disabled:opacity-50">
                    {deleting ? "…" : "Confirm"}
                  </button>
                  <span className="text-muted-foreground/40">·</span>
                  <button type="button" onClick={() => { setConfirm(false); setDeleteError(null) }}
                    className="text-xs text-muted-foreground hover:text-foreground">
                    Cancel
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirm(true)}
                  className="text-xs text-muted-foreground hover:text-red-500">
                  Delete
                </button>
              )}
            </div>
            {deleteError && (
              <p className="text-[10px] text-red-400">{deleteError}</p>
            )}
          </div>
        </td>
      </tr>

      {expanded && childDocs.map(child => (
        <DocRow key={child.id} doc={child} childDocs={[]} isChild onDeleted={onDeleted} onView={onView} />
      ))}
    </>
  )
}

// ─── AllDocumentsView ─────────────────────────────────────────────────────────

export function AllDocumentsView({ caseId }: { caseId: string }) {
  const { navigateToDocument, activeDocumentId, clearActiveDocument, entityDocFilter, setEntityDocFilter } = useWorkspace()
  const { entities } = useEntities(caseId)

  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [classFilter, setClassFilter] = useState<string>("")
  const [partyFilter, setPartyFilter] = useState<string>("")

  useEffect(() => {
    fetch(`/api/case/${caseId}/documents`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Document[]) => { setDocuments(data); setIsLoading(false) })
      .catch(() => setIsLoading(false))
  }, [caseId])

  // All unique doc types for the class filter chips
  const docTypes = useMemo(
    () => Array.from(new Set(documents.map(d => d.document_type).filter(Boolean) as string[])).sort(),
    [documents]
  )

  // Main parties from entities
  const parties = useMemo(
    () => entities.filter(e => e.node_type === "party").map(e => e.node_label),
    [entities]
  )

  // Collect all document IDs that mention the filtered entity
  const entityFilterDocIds = useMemo(() => {
    if (!entityDocFilter) return null
    const node = entities.find(e => e.id === entityDocFilter.id)
    if (!node) return null
    const ids = new Set<string>([node.document_id])
    for (const inst of node.instances ?? []) ids.add(inst.document_id)
    return ids
  }, [entityDocFilter, entities])

  const filtered = useMemo(() => {
    return documents.filter(d => {
      if (classFilter && d.document_type !== classFilter) return false
      if (partyFilter && !(
        d.file_name.toLowerCase().includes(partyFilter.toLowerCase()) ||
        (d.document_type ?? "").toLowerCase().includes(partyFilter.toLowerCase())
      )) return false
      if (entityFilterDocIds && !entityFilterDocIds.has(d.id)) return false
      return true
    })
  }, [documents, classFilter, partyFilter, entityFilterDocIds])

  const { topLevel, children } = groupDocuments(filtered)

  function handleDeleted(id: string) {
    setDocuments(prev => prev.filter(d => d.id !== id))
    if (activeDocumentId === id) {
      clearActiveDocument()
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Filters */}
      <div className="shrink-0 space-y-2 border-b border-border/30 px-3 py-2">
        {/* Doc class filter chips */}
        {docTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setClassFilter("")}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] transition-colors",
                classFilter === "" ? "bg-primary/15 text-primary font-medium" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              )}
            >
              All
            </button>
            {docTypes.map(t => (
              <button
                key={t}
                onClick={() => setClassFilter(classFilter === t ? "" : t)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] transition-colors",
                  classFilter === t ? "bg-primary/15 text-primary font-medium" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Party filter chips */}
        {parties.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="self-center text-[9px] uppercase tracking-wide text-muted-foreground/60 mr-1">Party:</span>
            {parties.slice(0, 6).map(p => (
              <button
                key={p}
                onClick={() => setPartyFilter(partyFilter === p ? "" : p)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] transition-colors",
                  partyFilter === p ? "bg-blue-500/15 text-blue-400 font-medium" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Entity doc filter banner */}
      {entityDocFilter && (
        <div className="shrink-0 flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-3 py-1.5">
          <span className="text-[10px] text-amber-400">
            Showing documents with: <span className="font-medium">{entityDocFilter.label}</span>
          </span>
          <button
            type="button"
            onClick={() => setEntityDocFilter(null)}
            className="text-[10px] text-amber-400/70 hover:text-amber-400"
          >
            Clear ✕
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/30" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No documents match the current filter.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-border/30 bg-background">
              <tr>
                <th className="w-6 px-3 py-2" />
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">File</th>
                <th className="hidden px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">Type</th>
                <th className="hidden px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">Pgs</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Conf</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {topLevel.map(doc => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  childDocs={children.get(doc.id) ?? []}
                  onDeleted={handleDeleted}
                  onView={(id) => navigateToDocument(id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer count */}
      <div className="shrink-0 border-t border-border/20 px-3 py-1.5">
        <p className="text-[10px] text-muted-foreground">
          {filtered.length} document{filtered.length !== 1 ? "s" : ""}
          {(classFilter || partyFilter || entityDocFilter) ? " (filtered)" : ""}
        </p>
      </div>
    </div>
  )
}
