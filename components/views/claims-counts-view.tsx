"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, ExternalLink, AlertCircle, CheckCircle2, HelpCircle } from "lucide-react"
import { useCounts } from "@/hooks/use-counts"
import { useWorkspace } from "@/providers/workspace-provider"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { EvidenceLink, LegalElement, Allegation, CountWithEvidence } from "@/lib/types/counts"

// ─── Evidence chip ────────────────────────────────────────────────────────────

function EvidenceChip({
  link,
  onNavigate,
}: {
  link: EvidenceLink
  onNavigate: (docId: string, sectionId?: string) => void
}) {
  const hasDoc = !!link.evidence_document_id
  const conf = link.confidence_score ?? 0
  const isStrong = conf >= 0.7

  return (
    <button
      type="button"
      disabled={!hasDoc}
      onClick={() => hasDoc && onNavigate(link.evidence_document_id!, link.evidence_section_id ?? undefined)}
      className={cn(
        "flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors",
        hasDoc
          ? "cursor-pointer border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
          : "cursor-default border-border/30 bg-muted/10 opacity-60",
      )}
    >
      <ExternalLink className={cn("mt-0.5 h-3 w-3 shrink-0", isStrong ? "text-emerald-500" : "text-amber-500")} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground/80">
          {link.evidence_document_name ?? link.evidence_reference ?? "Unknown document"}
        </p>
        {link.evidence_page && (
          <p className="text-[10px] text-muted-foreground">p. {link.evidence_page}</p>
        )}
        {link.evidence_snippet && (
          <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground/70">
            "{link.evidence_snippet}"
          </p>
        )}
      </div>
      <span className={cn(
        "shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold tabular-nums",
        isStrong ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500",
      )}>
        {(conf * 100).toFixed(0)}%
      </span>
    </button>
  )
}

function EvidenceNeeded({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 px-2.5 py-2">
      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
      <p className="text-xs text-amber-600 dark:text-amber-400">{text}</p>
    </div>
  )
}

// ─── Legal element row ────────────────────────────────────────────────────────

function ElementRow({
  element,
  onNavigate,
}: {
  element: LegalElement
  onNavigate: (docId: string, sectionId?: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasEvidence = element.evidence_links.length > 0
  const resolvedLinks = element.evidence_links.filter(l => !!l.evidence_document_id)

  return (
    <div className="rounded-lg border border-border/30 bg-background">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
      >
        {/* Status icon */}
        {resolvedLinks.length > 0 ? (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        ) : hasEvidence ? (
          <HelpCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        ) : (
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
        )}

        <span className="flex-1 text-xs font-medium">{element.element_label}</span>

        <span className={cn(
          "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium",
          resolvedLinks.length > 0
            ? "bg-emerald-500/10 text-emerald-500"
            : "bg-red-500/10 text-red-400"
        )}>
          {resolvedLinks.length > 0 ? `${resolvedLinks.length} evidence` : "No evidence"}
        </span>

        <svg
          className={cn("h-3 w-3 shrink-0 text-muted-foreground/50 transition-transform", expanded && "rotate-180")}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-border/20 px-3 pb-3 pt-2">
          {element.element_text && (
            <p className="text-[10px] leading-relaxed text-muted-foreground">{element.element_text}</p>
          )}
          {element.evidence_links.length > 0 ? (
            <div className="space-y-1.5">
              {element.evidence_links.map(link => (
                <EvidenceChip key={link.id} link={link} onNavigate={onNavigate} />
              ))}
            </div>
          ) : (
            <EvidenceNeeded text="No evidence linked to this element. Consider uploading supporting exhibits." />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Allegation row ───────────────────────────────────────────────────────────

function AllegationRow({
  allegation,
  onNavigate,
}: {
  allegation: Allegation
  onNavigate: (docId: string, sectionId?: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const resolvedLinks = allegation.evidence_links.filter(l => !!l.evidence_document_id)

  return (
    <div className="rounded-lg border border-border/20 bg-muted/5">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-start gap-2 px-3 py-2 text-left"
      >
        <span className="mt-0.5 shrink-0 text-[9px] font-semibold text-muted-foreground/60">
          ¶{allegation.allegation_number ?? "—"}
        </span>
        <span className="flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {allegation.allegation_text}
        </span>
        {resolvedLinks.length > 0 && (
          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
        )}
      </button>

      {expanded && allegation.evidence_links.length > 0 && (
        <div className="space-y-1.5 border-t border-border/10 px-3 pb-2.5 pt-2">
          {allegation.evidence_links.map(link => (
            <EvidenceChip key={link.id} link={link} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Count detail panel ───────────────────────────────────────────────────────

function CountDetail({
  count,
  onNavigate,
}: {
  count: CountWithEvidence
  onNavigate: (docId: string, sectionId?: string) => void
}) {
  const totalElements = count.elements.length
  const supportedElements = count.elements.filter(e =>
    e.evidence_links.some(l => !!l.evidence_document_id)
  ).length
  const gapCount = totalElements - supportedElements

  return (
    <div className="space-y-4 p-4">
      {/* Count header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">{count.count_label}</h2>
          {count.count_type && (
            <Badge variant="secondary" className="text-[10px]">{count.count_type}</Badge>
          )}
        </div>
        {count.summary && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{count.summary}</p>
        )}
        {/* Source navigation */}
        {count.document_id && (
          <button
            type="button"
            onClick={() => onNavigate(count.document_id!, count.section_id ?? undefined)}
            className="mt-2 flex items-center gap-1 text-[10px] text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            View in document
          </button>
        )}
      </div>

      {/* Evidence coverage bar */}
      {totalElements > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Elements covered</span>
            <span className={supportedElements === totalElements ? "text-emerald-500" : "text-amber-500"}>
              {supportedElements} / {totalElements}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                supportedElements === totalElements ? "bg-emerald-500" : "bg-amber-500"
              )}
              style={{ width: `${totalElements ? (supportedElements / totalElements) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Legal elements */}
      {count.elements.length > 0 && (
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Legal Elements ({count.elements.length})
          </h3>
          <div className="space-y-2">
            {count.elements.map(el => (
              <ElementRow key={el.id} element={el} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      )}

      {/* Direct count evidence */}
      {count.evidence_links.length > 0 && (
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Evidence ({count.evidence_links.length})
          </h3>
          <div className="space-y-1.5">
            {count.evidence_links.map(link => (
              <EvidenceChip key={link.id} link={link} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      )}

      {/* Allegations */}
      {count.allegations.length > 0 && (
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Allegations ({count.allegations.length})
          </h3>
          <div className="space-y-1.5">
            {count.allegations.map(a => (
              <AllegationRow key={a.id} allegation={a} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      )}

      {/* Evidence gaps summary */}
      {gapCount > 0 && (
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Evidence Gaps
          </h3>
          <EvidenceNeeded
            text={`${gapCount} legal element${gapCount !== 1 ? "s" : ""} ${gapCount !== 1 ? "are" : "is"} missing evidence. Consider uploading supporting exhibits and running the evidence linking agent.`}
          />
        </section>
      )}
    </div>
  )
}

// ─── ClaimsCountsView ─────────────────────────────────────────────────────────

export function ClaimsCountsView({ caseId }: { caseId: string }) {
  const { counts, isLoading, error } = useCounts(caseId)
  const { navigateToDocument } = useWorkspace()
  const [activeIndex, setActiveIndex] = useState(0)

  const total = counts.length
  const current = counts[activeIndex] ?? null

  const prev = () => setActiveIndex(i => Math.max(0, i - 1))
  const next = () => setActiveIndex(i => Math.min(total - 1, i + 1))

  const handleNavigate = (docId: string, sectionId?: string) => {
    navigateToDocument(docId, sectionId)
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/30" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-center text-xs text-red-400">{error}</p>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">No counts found</p>
        <p className="text-xs text-muted-foreground/60">
          Counts will appear after the complaint is processed by the extraction pipeline.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Step-through navigator */}
      <div className="shrink-0 border-b border-border/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={activeIndex === 0}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/30 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Count pills */}
          <div className="flex flex-1 items-center gap-1 overflow-x-auto scrollbar-none">
            {counts.map((c, i) => {
              const supported = c.elements.filter(el =>
                el.evidence_links.some(l => !!l.evidence_document_id)
              ).length
              const hasGaps = c.elements.length > 0 && supported < c.elements.length
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors",
                    i === activeIndex
                      ? "bg-primary text-primary-foreground"
                      : hasGaps
                        ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {c.count_number}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={next}
            disabled={activeIndex === total - 1}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/30 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <span className="shrink-0 text-[10px] text-muted-foreground">
            {activeIndex + 1} / {total}
          </span>
        </div>
      </div>

      {/* Count detail */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {current && <CountDetail count={current} onNavigate={handleNavigate} />}
      </div>
    </div>
  )
}
