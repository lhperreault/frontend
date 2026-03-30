"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { LightboxViewer } from "./lightbox-viewer"
import type { Document } from "@/lib/types/case"

interface WorkspaceCenterProps {
  caseId: string
  initialDocumentId: string | null
}

/**
 * Wraps LightboxViewer with a document switcher dropdown.
 * Reads ?doc= from the URL and keeps it in sync when the user switches.
 */
export function WorkspaceCenter({ caseId, initialDocumentId }: WorkspaceCenterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [documents, setDocuments] = useState<Document[]>([])
  const [documentId, setDocumentId] = useState<string | null>(initialDocumentId)

  // Keep documentId in sync with URL param (e.g. browser back/forward)
  useEffect(() => {
    const urlDoc = searchParams.get("doc")
    if (urlDoc && urlDoc !== documentId) setDocumentId(urlDoc)
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch(`/api/case/${caseId}/documents`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: Document[]) => setDocuments(data))
      .catch(() => {})
  }, [caseId])

  const handleSwitch = (docId: string) => {
    setDocumentId(docId)
    const params = new URLSearchParams(searchParams.toString())
    params.set("doc", docId)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Document switcher — only shown when there are multiple documents */}
      {documents.length > 1 && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border/30 bg-muted/10 px-4 py-1.5">
          <span className="text-xs text-muted-foreground">Document:</span>
          <select
            className="rounded border border-border/40 bg-transparent px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            value={documentId ?? ""}
            onChange={(e) => handleSwitch(e.target.value)}
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.file_name}{d.document_type ? ` — ${d.document_type}` : ""}
              </option>
            ))}
          </select>
          <a
            href={`/case/${caseId}/documents`}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            All documents →
          </a>
        </div>
      )}

      {/* Viewer */}
      <div className="flex-1 overflow-hidden">
        {documentId ? (
          <LightboxViewer
            key={documentId}
            documentId={documentId}
            caseId={caseId}
            scrollToSectionId={searchParams.get("section") ?? undefined}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium text-muted-foreground">No document open</p>
            <p className="text-xs text-muted-foreground/60">
              Select a document from the Knowledge Shelf or{" "}
              <a href={`/case/${caseId}/documents`} className="underline">
                browse all documents
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
