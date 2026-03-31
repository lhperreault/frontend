"use client"

import { useState } from "react"
import { useCase } from "@/providers/case-provider"
import { useWorkspace } from "@/providers/workspace-provider"
import { useEntities } from "@/hooks/use-entities"
import { useDocument } from "@/hooks/use-document"
import { cn } from "@/lib/utils"

// ─── Case-level summary ───────────────────────────────────────────────────────

function CaseSummary({ caseId }: { caseId: string }) {
  const caseCtx = useCase()
  const { entities, isLoading: entLoading } = useEntities(caseId)

  const parties     = entities.filter(e => e.node_type === "party")
  const claims      = entities.filter(e => e.node_type === "claim")
  const obligations = entities.filter(e => e.node_type === "obligation")

  if (caseCtx?.isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded-lg bg-muted/30" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5 p-4">
      {/* Case identity */}
      <section>
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Case Info
        </h2>
        <div className="space-y-1.5 rounded-xl border border-border/30 bg-muted/10 p-3">
          <InfoRow label="Case" value={caseCtx?.case_name} />
          <InfoRow label="Type" value={caseCtx?.case_type} />
          <InfoRow label="Stage" value={caseCtx?.case_stage} capitalize />
          <InfoRow label="Role" value={caseCtx?.party_role} capitalize />
          <InfoRow label="Client" value={caseCtx?.our_client} />
          <InfoRow label="Opposing" value={caseCtx?.opposing_party} />
          <InfoRow label="Court" value={caseCtx?.court_name} />
          <InfoRow label="Judge" value={caseCtx?.judge_name} />
          {caseCtx?.next_deadline && (
            <InfoRow
              label="Deadline"
              value={new Date(caseCtx.next_deadline).toLocaleDateString(undefined, {
                month: "short", day: "numeric", year: "numeric",
              })}
              highlight
            />
          )}
        </div>
      </section>

      {/* AI summary / case context */}
      {caseCtx?.case_context && (
        <section>
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            AI Summary
          </h2>
          <div className="rounded-xl border border-border/30 bg-muted/10 p-3">
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">
              {caseCtx.case_context}
            </p>
          </div>
        </section>
      )}

      {/* Parties */}
      {!entLoading && parties.length > 0 && (
        <section>
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Parties ({parties.length})
          </h2>
          <ul className="space-y-1">
            {parties.map(p => {
              const role = (p.properties?.role as string) ?? (p.properties?.party_type as string) ?? ""
              const conf = (p.properties?.confidence as number) ?? 1
              return (
                <li key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/10">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                  <span className="flex-1 truncate text-xs font-medium">{p.node_label}</span>
                  {role && <span className="text-[10px] capitalize text-muted-foreground">{role}</span>}
                  <span className={cn("text-[10px] tabular-nums",
                    conf >= 0.85 ? "text-emerald-500" : conf >= 0.7 ? "text-amber-500" : "text-slate-400"
                  )}>
                    {(conf * 100).toFixed(0)}%
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Claims */}
      {!entLoading && claims.length > 0 && (
        <section>
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Claims ({claims.length})
          </h2>
          <ul className="space-y-1">
            {claims.map(c => (
              <li key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/10">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                <span className="flex-1 truncate text-xs">{c.node_label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Obligations */}
      {!entLoading && obligations.length > 0 && (
        <section>
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Key Obligations ({obligations.length})
          </h2>
          <ul className="space-y-1">
            {obligations.slice(0, 8).map(o => {
              const party = (o.properties?.obligated_party as string) ?? ""
              return (
                <li key={o.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/10">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                  <span className="flex-1 truncate text-xs">{o.node_label}</span>
                  {party && <span className="text-[10px] text-muted-foreground">{party}</span>}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {!entLoading && entities.length === 0 && !caseCtx?.case_context && (
        <p className="text-xs text-muted-foreground">
          Summary will appear after documents are processed.
        </p>
      )}
    </div>
  )
}

// ─── Document-level summary ───────────────────────────────────────────────────

function DocSummary({ caseId }: { caseId: string }) {
  const { activeDocumentId, navigateToSection } = useWorkspace()
  const { document, sections, extractions, isLoading } = useDocument(activeDocumentId)

  if (!activeDocumentId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-center text-xs text-muted-foreground">
          Open a document to see its summary.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded-lg bg-muted/30" />
        ))}
      </div>
    )
  }

  const topSections = sections.filter(s => s.level <= 2).slice(0, 20)

  // Extractions grouped by type for quick stats
  const byType = extractions.reduce<Record<string, number>>((acc, e) => {
    acc[e.extraction_type] = (acc[e.extraction_type] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-5 p-4">
      {/* Doc metadata */}
      <section>
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Document
        </h2>
        <div className="space-y-1.5 rounded-xl border border-border/30 bg-muted/10 p-3">
          <InfoRow label="Name" value={document?.file_name} />
          <InfoRow label="Type" value={document?.document_type} />
          <InfoRow label="Pages" value={document?.total_pages != null ? String(document.total_pages) : undefined} />
          {document?.confidence_score != null && (
            <InfoRow
              label="Confidence"
              value={`${(document.confidence_score * 100).toFixed(0)}%`}
              highlight={document.confidence_score >= 0.85}
            />
          )}
        </div>
      </section>

      {/* Extraction stats */}
      {Object.keys(byType).length > 0 && (
        <section>
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Extractions
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(byType).map(([type, count]) => (
              <span key={type} className="rounded-full bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                {type} <span className="font-medium text-foreground/70">{count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Section TOC — clickable, drives Document view */}
      {topSections.length > 0 && (
        <section>
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Sections
          </h2>
          <ul className="space-y-0.5">
            {topSections.map(s => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => navigateToSection(s.id, s.anchor_id ?? undefined)}
                  className={cn(
                    "w-full rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/20",
                    s.level === 1 ? "font-medium" : "pl-5 text-muted-foreground",
                  )}
                >
                  {s.section_title || `Section (p.${s.page_range ?? "?"})`}
                  {s.page_range && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground/60">
                      p.{s.page_range}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

// ─── InfoRow helper ───────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  capitalize = false,
  highlight = false,
}: {
  label: string
  value: string | null | undefined
  capitalize?: boolean
  highlight?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2">
      <span className="w-16 shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <span className={cn(
        "flex-1 text-xs",
        capitalize && "capitalize",
        highlight && "font-medium text-amber-400",
      )}>
        {value}
      </span>
    </div>
  )
}

// ─── SummaryView ──────────────────────────────────────────────────────────────

export function SummaryView({ caseId }: { caseId: string }) {
  const { activeDocumentId } = useWorkspace()
  const [mode, setMode] = useState<"case" | "doc">("case")

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Mode toggle */}
      <div className="shrink-0 border-b border-border/30 px-3 py-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">Summary</p>
          <div className="flex rounded-md border border-border/40 text-[10px]">
            <button
              onClick={() => setMode("case")}
              className={cn(
                "rounded-l-md px-2.5 py-1 transition-colors",
                mode === "case" ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted/20"
              )}
            >
              Case
            </button>
            <button
              onClick={() => setMode("doc")}
              disabled={!activeDocumentId}
              className={cn(
                "rounded-r-md px-2.5 py-1 transition-colors disabled:opacity-40",
                mode === "doc" ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted/20"
              )}
            >
              This doc
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {mode === "case"
          ? <CaseSummary caseId={caseId} />
          : <DocSummary caseId={caseId} />
        }
      </div>
    </div>
  )
}
