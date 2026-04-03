"use client"

import { useState } from "react"
import Link from "next/link"
import type { Document } from "@/lib/types/case"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DocumentsTableProps {
  documents: Document[]
  caseId: string
}

/** Separate top-level docs from child exhibits */
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

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-muted-foreground">—</span>
  return (
    <span className={cn("tabular-nums font-mono text-xs", confidenceColor(score))}>
      {(score * 100).toFixed(0)}%
    </span>
  )
}

interface DocRowProps {
  doc: Document
  children: Document[]
  caseId: string
  isChild?: boolean
  onDeleted: (id: string) => void
}

function DocRow({ doc, children, caseId, isChild = false, onDeleted }: DocRowProps) {
  const [expanded,  setExpanded]  = useState(false)
  const [confirm,   setConfirm]   = useState(false)
  const [deleting,  setDeleting]  = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/case/${caseId}/documents/${doc.id}`, { method: "DELETE" })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error("[DocumentsTable] delete failed:", body)
      setDeleting(false)
      setConfirm(false)
      return
    }
    onDeleted(doc.id)
  }

  return (
    <>
      <tr
        className={cn(
          "border-b border-border/30 transition-colors hover:bg-muted/30",
          isChild && "bg-muted/10",
        )}
      >
        {/* Expand / indent */}
        <td className="px-4 py-2.5 w-6">
          {children.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              title={expanded ? "Collapse exhibits" : "Expand exhibits"}
            >
              <svg
                className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </td>

        {/* File name */}
        <td className="px-3 py-2.5 min-w-0">
          <div className={cn("flex items-center gap-2", isChild && "pl-4")}>
            {isChild && (
              <span className="shrink-0 text-[9px] uppercase tracking-wide text-muted-foreground/60 border border-border/40 rounded px-1">
                exhibit
              </span>
            )}
            <span className="truncate text-sm font-medium text-foreground/90">
              {doc.file_name}
            </span>
          </div>
        </td>

        {/* Type */}
        <td className="px-3 py-2.5 hidden md:table-cell">
          {doc.document_type ? (
            <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
              {doc.document_type}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>

        {/* Pages */}
        <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums hidden sm:table-cell">
          {doc.total_pages ?? "—"}
        </td>

        {/* Confidence */}
        <td className="px-3 py-2.5">
          <ConfidenceBadge score={doc.confidence_score} />
        </td>

        {/* Exhibits count */}
        <td className="px-3 py-2.5 text-xs text-muted-foreground hidden lg:table-cell">
          {children.length > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="hover:text-foreground transition-colors"
            >
              {children.length} exhibit{children.length !== 1 ? "s" : ""}
            </button>
          ) : (
            "—"
          )}
        </td>

        {/* Actions */}
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Link
              href={`/case/${caseId}/workspace?doc=${doc.id}`}
              className="text-xs font-medium text-primary hover:underline"
            >
              View
            </Link>

            {confirm ? (
              <span className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs font-medium text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Confirm"}
                </button>
                <span className="text-muted-foreground/40">·</span>
                <button
                  type="button"
                  onClick={() => setConfirm(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirm(true)}
                className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded child exhibits */}
      {expanded && children.map((child) => (
        <DocRow
          key={child.id}
          doc={child}
          children={[]}
          caseId={caseId}
          isChild
          onDeleted={onDeleted}
        />
      ))}
    </>
  )
}

export function DocumentsTable({ documents: initial, caseId }: DocumentsTableProps) {
  const [documents, setDocuments] = useState<Document[]>(initial)

  function handleDeleted(id: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }

  const { topLevel, children } = groupDocuments(documents)

  if (!documents.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No documents in this case yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/30">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/30 bg-muted/20 text-left">
            <th className="px-4 py-2.5 w-6" />
            <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              File
            </th>
            <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
              Type
            </th>
            <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
              Pages
            </th>
            <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Confidence
            </th>
            <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">
              Exhibits
            </th>
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {topLevel.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              children={children.get(doc.id) ?? []}
              caseId={caseId}
              onDeleted={handleDeleted}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
