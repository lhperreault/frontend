"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { useDocument } from "@/hooks/use-document"
import { useDocumentXhtml } from "@/hooks/use-document-xhtml"
import { useEntities } from "@/hooks/use-entities"
import { useWorkspace } from "@/providers/workspace-provider"
import { DocumentNav } from "./document-nav"
import { DocumentHighlighter } from "./document-highlighter"
import { EntityHighlighter } from "./entity-highlighter"
import { HoverSyncHandler } from "./hover-sync-handler"
import { cn } from "@/lib/utils"

interface LightboxViewerProps {
  documentId: string
  caseId: string
  /** When set, auto-scrolls to this section_id after the document finishes loading */
  scrollToSectionId?: string
  className?: string
}

/**
 * Light-Box Viewer — the center-stage document reader.
 *
 * Handles two document modes:
 * 1. HTML/XHTML docs (tagged_xhtml_url present): renders tagged XHTML with
 *    ai-chunk-NNNNN IDs, applies glow overlays on top.
 * 2. Non-HTML docs (PDF/Word): renders section_text blocks in sequence.
 *
 * Paper-white background in both light and dark mode for readability.
 */
export function LightboxViewer({ documentId, caseId, scrollToSectionId, className }: LightboxViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | undefined>()
  const [showNav, setShowNav] = useState(true)
  const { highlightedSectionIds } = useWorkspace()

  const { document, sections, extractions, isLoading } = useDocument(documentId)
  const { entities } = useEntities(caseId)
  // Use the server-side proxy to avoid CORS issues with Supabase Storage
  const xhtmlProxyUrl = document?.tagged_xhtml_url
    ? `/api/case/${caseId}/xhtml?document_id=${documentId}`
    : null
  const { xhtml, isLoading: xhtmlLoading } = useDocumentXhtml(xhtmlProxyUrl)

  const loading = isLoading || xhtmlLoading

  // If a Title Page section exists among root sections, move it to the front
  const sortedSections = useMemo(() => {
    if (!sections.length) return sections
    const titleIdx = sections.findIndex(
      (s) => !s.parent_section_id && /title\s*page/i.test(s.section_title ?? ""),
    )
    if (titleIdx <= 0) return sections
    const result = [...sections]
    const [titlePage] = result.splice(titleIdx, 1)
    result.unshift(titlePage)
    return result
  }, [sections])

  // Auto-scroll to scrollToSectionId once loading finishes
  useEffect(() => {
    if (loading || !scrollToSectionId || !contentRef.current) return
    const container = contentRef.current

    // Text mode: [data-section-id]
    let el = container.querySelector(
      `[data-section-id="${scrollToSectionId}"]`,
    ) as HTMLElement | null

    // XHTML mode: look up anchor_id from sections, then find #anchorId
    if (!el && xhtml) {
      const sec = sortedSections.find((s) => s.id === scrollToSectionId)
      if (sec?.anchor_id) {
        el = container.querySelector(`#${sec.anchor_id}`) as HTMLElement | null
      }
    }

    if (el) {
      setActiveSectionId(scrollToSectionId)
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [loading, scrollToSectionId, sortedSections, xhtml])

  const handleNavSelect = (sectionId: string, anchorId?: string | null) => {
    setActiveSectionId(sectionId)
    const container = contentRef.current
    if (!container) return

    if (anchorId) {
      const el = container.querySelector(`#${anchorId}`)
      el?.scrollIntoView({ behavior: "smooth", block: "start" })
    } else {
      const el = container.querySelector(`[data-section-id="${sectionId}"]`)
      el?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div
      className={cn(
        "flex h-full overflow-hidden bg-white dark:bg-slate-50 text-slate-800",
        className,
      )}
    >
      {/* Collapsible TOC sidebar */}
      {showNav && sortedSections.length > 0 && (
        <div className="w-48 shrink-0 border-r border-slate-200 overflow-hidden">
          <DocumentNav
            sections={sortedSections}
            activeSectionId={activeSectionId}
            highlightedSectionIds={highlightedSectionIds}
            onSelect={handleNavSelect}
            onToggle={() => setShowNav(false)}
          />
        </div>
      )}

      {/* Document content */}
      <div className="relative flex-1 overflow-hidden">
        {/* Expand TOC button when collapsed */}
        {!showNav && (
          <button
            type="button"
            onClick={() => setShowNav(true)}
            className="absolute left-2 top-2 z-10 rounded px-2 py-1 text-[10px] bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            title="Show Table of Contents"
          >
            ▸ TOC
          </button>
        )}

        <div
          ref={contentRef}
          className="h-full overflow-y-auto"
          style={{ scrollBehavior: "smooth" }}
        >
          {loading ? (
            <div className="px-12 py-8 max-w-4xl mx-auto space-y-4 animate-pulse">
              <div className="h-7 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-full" />
              <div className="h-4 bg-slate-100 rounded w-5/6" />
              <div className="h-4 bg-slate-100 rounded w-4/5" />
              <div className="mt-6 h-5 bg-slate-200 rounded w-1/2" />
              <div className="h-4 bg-slate-100 rounded w-full" />
              <div className="h-4 bg-slate-100 rounded w-5/6" />
            </div>
          ) : xhtml ? (
            // HTML documents: render tagged XHTML
            <div
              className="lightbox-content px-12 py-8 max-w-4xl mx-auto font-[Inter,system-ui,sans-serif] text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: xhtml }}
            />
          ) : (
            // Non-HTML documents: render section blocks
            <div className="px-12 py-8 max-w-4xl mx-auto font-[Inter,system-ui,sans-serif]">
              {sortedSections.length === 0 && (
                <p className="text-slate-400 text-sm italic">
                  No content available for this document.
                </p>
              )}
              {sortedSections.map((section) => {
                // Strip pipeline annotation lines e.g. "[Split into N sub-sections by script.py]"
                const cleanText = (section.section_text ?? "")
                  .split("\n")
                  .filter((line) => !/^\s*\[.+\.py\]/.test(line))
                  .join("\n")
                  .trim()

                return (
                  <div
                    key={section.id}
                    data-section-id={section.id}
                    className="mb-8"
                  >
                    {section.level <= 1 ? (
                      <h1 className="mb-3 text-xl font-semibold text-slate-900 leading-snug">
                        {section.section_title ?? "Untitled Section"}
                      </h1>
                    ) : section.level === 2 ? (
                      <h2 className="mb-2 text-base font-semibold text-slate-900">
                        {section.section_title ?? "Untitled Section"}
                      </h2>
                    ) : (
                      <h3 className="mb-2 text-sm font-semibold text-slate-800">
                        {section.section_title ?? "Untitled Section"}
                      </h3>
                    )}
                    <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                      {cleanText}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Glow overlay — section-level confidence highlights */}
        {!loading && (
          <DocumentHighlighter
            extractions={extractions}
            sections={sections}
            containerRef={contentRef}
            isXhtml={!!xhtml}
          />
        )}

        {/* Entity name highlights — text-level, additive */}
        {!loading && entities.length > 0 && (
          <EntityHighlighter entities={entities} containerRef={contentRef} />
        )}

        {/* Hover-sync scroll handler */}
        <HoverSyncHandler containerRef={contentRef} />
      </div>
    </div>
  )
}
