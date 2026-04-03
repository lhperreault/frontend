"use client"

import { useEffect, useState } from "react"
import { useWorkspace } from "@/providers/workspace-provider"
import { LightboxViewer } from "@/components/lightbox/lightbox-viewer"
import type { Document } from "@/lib/types/case"

export function DocumentView({ caseId }: { caseId: string }) {
  const { activeDocumentId, navigateToDocument, scrollTarget, clearScrollTarget } =
    useWorkspace()

  const [documents, setDocuments] = useState<Document[]>([])

  useEffect(() => {
    fetch(`/api/case/${caseId}/documents`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Document[]) => setDocuments(data))
      .catch(() => {})
  }, [caseId, activeDocumentId])

  const handleSwitch = (docId: string) => {
    navigateToDocument(docId)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Document switcher — shown when there are multiple documents */}
      {documents.length > 1 && (
        <div className="flex shrink-0 items-center gap-2 border-b border-border/30 bg-muted/10 px-4 py-1.5">
          <span className="text-xs text-muted-foreground">Document:</span>
          <select
            className="rounded border border-border/40 bg-transparent px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            value={activeDocumentId ?? ""}
            onChange={(e) => handleSwitch(e.target.value)}
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.file_name}
                {d.document_type ? ` — ${d.document_type}` : ""}
              </option>
            ))}
          </select>
          <a
            href={`/case/${caseId}/documents`}
            className="ml-auto text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            All documents →
          </a>
        </div>
      )}

      {/* Viewer */}
      <div className="flex-1 overflow-hidden">
        {activeDocumentId ? (
          <LightboxViewer
            key={activeDocumentId}
            documentId={activeDocumentId}
            caseId={caseId}
            scrollToSectionId={scrollTarget?.sectionId}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium text-muted-foreground">No document open</p>
            <p className="text-xs text-muted-foreground/60">
              Select a document from Filter &amp; Search or{" "}
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
