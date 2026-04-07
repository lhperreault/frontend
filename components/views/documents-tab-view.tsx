"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { OmniDropZone } from "@/components/entryway/omni-drop-zone"
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
  caseId,
  isChild = false,
  onDeleted,
}: {
  doc: Document
  childDocs: Document[]
  caseId: string
  isChild?: boolean
  onDeleted: (id: string) => void
}) {
  const [expanded,    setExpanded]    = useState(false)
  const [confirm,     setConfirm]     = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/case/${caseId}/documents/${doc.id}`, { method: "DELETE" })
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
        <td className="w-6 px-4 py-2.5">
          {childDocs.length > 0 && (
            <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground/60 hover:text-muted-foreground transition-colors" title={expanded ? "Collapse exhibits" : "Expand exhibits"}>
              <svg className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </td>

        {/* File name */}
        <td className="min-w-0 px-3 py-2.5">
          <div className={cn("flex items-center gap-2", isChild && "pl-4")}>
            {isChild && (
              <span className="shrink-0 rounded border border-border/40 px-1 text-[9px] uppercase tracking-wide text-muted-foreground/60">exhibit</span>
            )}
            <span className="truncate text-sm font-medium text-foreground/90">{doc.file_name}</span>
          </div>
        </td>

        {/* Type */}
        <td className="hidden px-3 py-2.5 md:table-cell">
          {doc.document_type
            ? <Badge variant="secondary" className="whitespace-nowrap text-[10px]">{doc.document_type}</Badge>
            : <span className="text-xs text-muted-foreground">—</span>}
        </td>

        {/* Pages */}
        <td className="hidden px-3 py-2.5 text-xs tabular-nums text-muted-foreground sm:table-cell">
          {doc.total_pages ?? "—"}
        </td>

        {/* Confidence */}
        <td className="px-3 py-2.5">
          {doc.confidence_score != null
            ? <span className={cn("font-mono text-xs tabular-nums", confidenceColor(doc.confidence_score))}>{(doc.confidence_score * 100).toFixed(0)}%</span>
            : <span className="text-xs text-muted-foreground">—</span>}
        </td>

        {/* Exhibits count */}
        <td className="hidden px-3 py-2.5 text-xs text-muted-foreground lg:table-cell">
          {childDocs.length > 0
            ? <button type="button" onClick={() => setExpanded(v => !v)} className="hover:text-foreground transition-colors">{childDocs.length} exhibit{childDocs.length !== 1 ? "s" : ""}</button>
            : "—"}
        </td>

        {/* Actions */}
        <td className="px-4 py-2.5">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-3">
              <Link href={`/case/${caseId}/workspace?doc=${doc.id}`} className="text-xs font-medium text-primary hover:underline">
                View
              </Link>
              {confirm ? (
                <span className="flex items-center gap-1.5">
                  <button type="button" onClick={handleDelete} disabled={deleting}
                    className="text-xs font-medium text-red-500 hover:text-red-400 disabled:opacity-50 transition-colors">
                    {deleting ? "Deleting…" : "Confirm delete"}
                  </button>
                  <span className="text-muted-foreground/40">·</span>
                  <button type="button" onClick={() => { setConfirm(false); setDeleteError(null) }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Cancel
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirm(true)}
                  className="text-xs text-muted-foreground hover:text-red-500 transition-colors">
                  Delete
                </button>
              )}
            </div>
            {confirm && !deleting && childDocs.length > 0 && (
                <p className="text-[10px] text-amber-400 mt-0.5">
                  This will also permanently delete {childDocs.length} attached exhibit{childDocs.length !== 1 ? "s" : ""}:{" "}
                  {childDocs.map(c => c.file_name).join(", ")}
                </p>
              )}
            {deleteError && <p className="text-[10px] text-red-400">{deleteError}</p>}
          </div>
        </td>
      </tr>

      {expanded && childDocs.map(child => (
        <DocRow key={child.id} doc={child} childDocs={[]} caseId={caseId} isChild onDeleted={onDeleted} />
      ))}
    </>
  )
}

// ─── Exhibit filter options ───────────────────────────────────────────────────

type ExhibitFilter = "all" | "has_exhibits" | "is_exhibit"

// ─── DocumentsTabView ─────────────────────────────────────────────────────────

export function DocumentsTabView({ caseId }: { caseId: string }) {
  const [documents,    setDocuments]    = useState<Document[]>([])
  const [isLoading,    setIsLoading]    = useState(true)
  const [uploadOpen,   setUploadOpen]   = useState(false)
  const [typeFilter,   setTypeFilter]   = useState<string>("")
  const [exhibitFilter, setExhibitFilter] = useState<ExhibitFilter>("all")

  const fetchDocuments = useCallback(() => {
    setIsLoading(true)
    fetch(`/api/case/${caseId}/documents`)
      .then(r => r.ok ? r.json() : [])
      .then((data: Document[]) => { setDocuments(data); setIsLoading(false) })
      .catch(() => setIsLoading(false))
  }, [caseId])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  // All unique document types for filter chips
  const docTypes = useMemo(
    () => Array.from(new Set(documents.map(d => d.document_type).filter(Boolean) as string[])).sort(),
    [documents],
  )

  // Build a set of parent IDs so we can check "has exhibits"
  const parentIds = useMemo(() => {
    const s = new Set<string>()
    for (const d of documents) { if (d.parent_document_id) s.add(d.parent_document_id) }
    return s
  }, [documents])

  const filtered = useMemo(() => {
    return documents.filter(d => {
      if (typeFilter && d.document_type !== typeFilter) return false
      if (exhibitFilter === "has_exhibits" && !parentIds.has(d.id)) return false
      if (exhibitFilter === "is_exhibit" && !d.parent_document_id) return false
      return true
    })
  }, [documents, typeFilter, exhibitFilter, parentIds])

  const { topLevel, children } = groupDocuments(filtered)

  function handleDeleted(id: string) {
    setDocuments(prev => prev.filter(d => d.id !== id && d.parent_document_id !== id))
  }

  const EXHIBIT_FILTERS: { value: ExhibitFilter; label: string }[] = [
    { value: "all",          label: "All" },
    { value: "has_exhibits", label: "Has Exhibits" },
    { value: "is_exhibit",   label: "Is Exhibit" },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-4 px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Documents</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {documents.length} document{documents.length !== 1 ? "s" : ""} in this case
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUploadOpen(v => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
              uploadOpen
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Upload
          </button>
        </div>

        {/* Upload zone */}
        {uploadOpen && (
          <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
            <OmniDropZone
              initialCaseId={caseId}
              onUploadComplete={fetchDocuments}
            />
          </div>
        )}

        {/* Filters */}
        <div className="space-y-2">
          {/* Doc type chips */}
          {docTypes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] uppercase tracking-wide text-muted-foreground/60">Type:</span>
              <button
                onClick={() => setTypeFilter("")}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs transition-colors",
                  typeFilter === "" ? "bg-primary/15 font-medium text-primary" : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
                )}
              >
                All
              </button>
              {docTypes.map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(typeFilter === t ? "" : t)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs transition-colors",
                    typeFilter === t ? "bg-primary/15 font-medium text-primary" : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Exhibit filter chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] uppercase tracking-wide text-muted-foreground/60">Exhibits:</span>
            {EXHIBIT_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setExhibitFilter(f.value)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs transition-colors",
                  exhibitFilter === f.value ? "bg-blue-500/15 font-medium text-blue-400" : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/30" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {documents.length === 0 ? "No documents in this case yet." : "No documents match the current filter."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/30">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-muted/20 text-left">
                  <th className="w-6 px-4 py-2.5" />
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">File</th>
                  <th className="hidden px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">Type</th>
                  <th className="hidden px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">Pages</th>
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confidence</th>
                  <th className="hidden px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">Exhibits</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {topLevel.map(doc => (
                  <DocRow
                    key={doc.id}
                    doc={doc}
                    childDocs={children.get(doc.id) ?? []}
                    caseId={caseId}
                    onDeleted={handleDeleted}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {!isLoading && filtered.length > 0 && (typeFilter || exhibitFilter !== "all") && (
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {documents.length} documents
          </p>
        )}
      </div>
    </div>
  )
}
