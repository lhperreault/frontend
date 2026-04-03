"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp, Upload, AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { useBriefingV2 } from "@/hooks/use-briefing"
import { useTimeline } from "@/hooks/use-timeline"
import { TimelineStrip } from "@/components/chronology/timeline-strip"
import { cn } from "@/lib/utils"
import type {
  BriefingSection,
  BriefingSectionId,
  CaseMetadataData,
  PartiesRolesData,
  GoverningDocumentsData,
  ContractualProvisionsData,
  ObligationsDutiesData,
  EventsTimelineData,
  NoticeCureData,
  JurisdictionForumData,
  ClaimsCountsData,
  DamagesData,
  EvidenceInventoryData,
  SolInputsData,
} from "@/lib/types/briefing"
import type { TimelineEvent } from "@/lib/types/timeline-event"

// ── Props ─────────────────────────────────────────────────────────────────────

interface BriefingDashboardProps {
  caseId: string
}

// ── Main Component ────────────────────────────────────────────────────────────

export function BriefingDashboard({ caseId }: BriefingDashboardProps) {
  const { briefing, isLoading } = useBriefingV2(caseId)
  const { events, isLoading: timeLoading } = useTimeline(caseId)
  const [collapsed, setCollapsed] = useState<Set<BriefingSectionId>>(new Set())

  const toggle = (id: BriefingSectionId) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // Not ready state
  if (!isLoading && (!briefing || briefing.overallCompleteness === 0)) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <div className="glass max-w-lg space-y-4 rounded-2xl p-8 text-center">
          <p className="text-sm font-medium">Case briefing not yet available</p>
          <p className="text-xs text-muted-foreground">
            Upload documents to generate your case briefing.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass h-28 animate-pulse rounded-xl opacity-40" />
            ))}
          </div>
          <Link
            href={`/case/${caseId}/documents`}
            className="inline-block text-xs text-primary hover:underline"
          >
            Upload documents →
          </Link>
        </div>
      </div>
    )
  }

  const s = briefing?.sections
  const overall = briefing?.overallCompleteness ?? 0

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Case Briefing</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isLoading ? "Loading…" : `Commercial Litigation · ${Math.round(overall * 100)}% complete`}
          </p>
        </div>
        {/* Overall completeness bar */}
        <div className="flex min-w-[120px] flex-col items-end gap-1">
          <span className="text-[10px] text-muted-foreground">Overall completeness</span>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted/40">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                overall >= 0.8 ? "bg-emerald-500" : overall >= 0.5 ? "bg-amber-400" : "bg-red-400",
              )}
              style={{ width: `${Math.round(overall * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Row 1 — full width */}
        {s ? (
          <SectionCard
            section={s.case_metadata}
            collapsed={collapsed.has("case_metadata")}
            onToggle={() => toggle("case_metadata")}
            caseId={caseId}
            fullWidth
          >
            {isLoading ? <Skeleton rows={4} /> : <RenderCaseMetadata data={s.case_metadata.data} />}
          </SectionCard>
        ) : (
          <SkeletonCard fullWidth />
        )}

        {/* Row 2 */}
        {s ? (
          <SectionCard section={s.parties_roles} collapsed={collapsed.has("parties_roles")} onToggle={() => toggle("parties_roles")} caseId={caseId}>
            {isLoading ? <Skeleton rows={3} /> : <RenderPartiesRoles data={s.parties_roles.data} />}
          </SectionCard>
        ) : <SkeletonCard />}

        {s ? (
          <SectionCard section={s.governing_documents} collapsed={collapsed.has("governing_documents")} onToggle={() => toggle("governing_documents")} caseId={caseId}>
            {isLoading ? <Skeleton rows={3} /> : <RenderGoverningDocuments data={s.governing_documents.data} />}
          </SectionCard>
        ) : <SkeletonCard />}

        {/* Row 3 */}
        {s ? (
          <SectionCard section={s.jurisdiction_forum} collapsed={collapsed.has("jurisdiction_forum")} onToggle={() => toggle("jurisdiction_forum")} caseId={caseId}>
            {isLoading ? <Skeleton rows={3} /> : <RenderJurisdictionForum data={s.jurisdiction_forum.data} />}
          </SectionCard>
        ) : <SkeletonCard />}

        {s ? (
          <SectionCard section={s.contractual_provisions} collapsed={collapsed.has("contractual_provisions")} onToggle={() => toggle("contractual_provisions")} caseId={caseId}>
            {isLoading ? <Skeleton rows={4} /> : <RenderContractualProvisions data={s.contractual_provisions.data} />}
          </SectionCard>
        ) : <SkeletonCard />}

        {/* Row 4 */}
        {s ? (
          <SectionCard section={s.claims_counts} collapsed={collapsed.has("claims_counts")} onToggle={() => toggle("claims_counts")} caseId={caseId}>
            {isLoading ? <Skeleton rows={4} /> : <RenderClaimsCounts data={s.claims_counts.data} />}
          </SectionCard>
        ) : <SkeletonCard />}

        {s ? (
          <SectionCard section={s.damages} collapsed={collapsed.has("damages")} onToggle={() => toggle("damages")} caseId={caseId}>
            {isLoading ? <Skeleton rows={3} /> : <RenderDamages data={s.damages.data} />}
          </SectionCard>
        ) : <SkeletonCard />}

        {/* Row 5 */}
        {s ? (
          <SectionCard section={s.obligations_duties} collapsed={collapsed.has("obligations_duties")} onToggle={() => toggle("obligations_duties")} caseId={caseId}>
            {isLoading ? <Skeleton rows={3} /> : <RenderObligationsDuties data={s.obligations_duties.data} />}
          </SectionCard>
        ) : <SkeletonCard />}

        {s ? (
          <SectionCard section={s.notice_cure} collapsed={collapsed.has("notice_cure")} onToggle={() => toggle("notice_cure")} caseId={caseId}>
            {isLoading ? <Skeleton rows={3} /> : <RenderNoticeCure data={s.notice_cure.data} />}
          </SectionCard>
        ) : <SkeletonCard />}

        {/* Row 6 — full width timeline */}
        {s ? (
          <SectionCard section={s.events_timeline} collapsed={collapsed.has("events_timeline")} onToggle={() => toggle("events_timeline")} caseId={caseId} fullWidth>
            {timeLoading ? (
              <Skeleton rows={1} />
            ) : (
              <RenderEventsTimeline data={s.events_timeline.data} events={events} caseId={caseId} />
            )}
          </SectionCard>
        ) : <SkeletonCard fullWidth />}

        {/* Row 7 */}
        {s ? (
          <SectionCard section={s.evidence_inventory} collapsed={collapsed.has("evidence_inventory")} onToggle={() => toggle("evidence_inventory")} caseId={caseId}>
            {isLoading ? <Skeleton rows={3} /> : <RenderEvidenceInventory data={s.evidence_inventory.data} />}
          </SectionCard>
        ) : <SkeletonCard />}

        {s ? (
          <SectionCard section={s.sol_inputs} collapsed={collapsed.has("sol_inputs")} onToggle={() => toggle("sol_inputs")} caseId={caseId}>
            {isLoading ? <Skeleton rows={3} /> : <RenderSolInputs data={s.sol_inputs.data} />}
          </SectionCard>
        ) : <SkeletonCard />}
      </div>
    </div>
  )
}

// ── SectionCard ───────────────────────────────────────────────────────────────

function SectionCard({
  section,
  collapsed,
  onToggle,
  caseId,
  fullWidth = false,
  children,
}: {
  section: BriefingSection<unknown>
  collapsed: boolean
  onToggle: () => void
  caseId: string
  fullWidth?: boolean
  children: React.ReactNode
}) {
  const { gap, summary, title } = section
  const c = gap.completeness

  return (
    <div className={cn("glass flex flex-col gap-3 rounded-xl p-4", fullWidth && "md:col-span-2")}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </h2>
          {/* Completeness chip */}
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[9px] font-semibold tabular-nums",
              c >= 0.8
                ? "bg-emerald-500/10 text-emerald-500"
                : c >= 0.5
                ? "bg-amber-400/10 text-amber-400"
                : "bg-red-400/10 text-red-400",
            )}
          >
            {Math.round(c * 100)}%
          </span>
        </div>
        {collapsed ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {!collapsed && (
        <>
          {/* Section body */}
          <div className="flex-1 overflow-hidden">{children}</div>

          {/* AI summary block */}
          {summary ? (
            <div className="rounded-lg border border-primary/10 bg-primary/5 p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-primary/70">AI Summary</span>
                <span
                  className={cn(
                    "rounded-full px-1 py-0 text-[8px] font-semibold",
                    summary.confidence >= 0.8 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-400/10 text-amber-400",
                  )}
                >
                  {Math.round(summary.confidence * 100)}%
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-foreground/80">{summary.text}</p>
            </div>
          ) : null}

          {/* Gap block */}
          {gap.suggestions.length > 0 && (
            <div className="rounded-lg border border-amber-400/15 bg-amber-400/5 p-2.5">
              <div className="flex flex-wrap gap-1.5">
                {gap.suggestions.map((s, i) => (
                  <Link
                    key={i}
                    href={`/case/${caseId}/documents`}
                    className="flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-400 transition-colors hover:bg-amber-400/20"
                  >
                    <Upload className="h-2.5 w-2.5 shrink-0" />
                    {s}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Skeleton helpers ──────────────────────────────────────────────────────────

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-7 animate-pulse rounded-lg bg-muted/50" />
      ))}
    </div>
  )
}

function SkeletonCard({ fullWidth = false }: { fullWidth?: boolean }) {
  return (
    <div className={cn("glass h-36 animate-pulse rounded-xl opacity-40", fullWidth && "md:col-span-2")} />
  )
}

function DefRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <span className="w-28 shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <span className="truncate text-xs font-medium">{value ?? <span className="text-muted-foreground/40">—</span>}</span>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}

// ── Section render functions ──────────────────────────────────────────────────

function RenderCaseMetadata({ data }: { data: CaseMetadataData | null }) {
  if (!data) return <Empty>No case metadata available.</Empty>
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-0 sm:grid-cols-2">
      <DefRow label="Case Type" value={data.caseType} />
      <DefRow label="Court" value={data.courtName} />
      <DefRow label="Judge" value={data.judgeName} />
      <DefRow label="Our Client" value={data.ourClient} />
      <DefRow label="Opposing Party" value={data.opposingParty} />
      <DefRow label="Party Role" value={data.partyRole} />
      <DefRow label="Filing Date" value={data.filingDate} />
      <DefRow label="Jurisdiction" value={data.jurisdiction} />
    </div>
  )
}

function RenderPartiesRoles({ data }: { data: PartiesRolesData | null }) {
  if (!data || data.parties.length === 0) return <Empty>No parties identified yet.</Empty>
  return (
    <div className="space-y-1">
      {data.contracting_party_mismatch && (
        <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-amber-400/10 px-2.5 py-1.5 text-[10px] text-amber-400">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Contracting party mismatch detected — signatory entity differs from named party.
        </div>
      )}
      <ul className="space-y-1">
        {data.parties.map((p, i) => (
          <li key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/10">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
            <span className="flex-1 truncate text-xs font-medium">{p.label}</span>
            {p.role && <span className="shrink-0 text-[10px] capitalize text-muted-foreground">{p.role}</span>}
            {p.aliases.length > 0 && (
              <span className="shrink-0 rounded-full bg-muted/30 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                +{p.aliases.length} alias
              </span>
            )}
            <span
              className={cn(
                "shrink-0 text-[10px] tabular-nums",
                p.confidence >= 0.85 ? "text-emerald-500" : p.confidence >= 0.7 ? "text-amber-500" : "text-slate-400",
              )}
            >
              {Math.round(p.confidence * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RenderGoverningDocuments({ data }: { data: GoverningDocumentsData | null }) {
  if (!data || data.documents.length === 0) return <Empty>No governing documents uploaded yet.</Empty>
  return (
    <ul className="space-y-1.5">
      {data.documents.map((d) => (
        <li key={d.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/10">
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-medium">{d.fileName}</p>
            <p className="text-[10px] text-muted-foreground">
              {d.documentType ?? "Unknown type"}{d.totalPages ? ` · ${d.totalPages} pages` : ""}
            </p>
          </div>
          {d.executed !== null && (
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                d.executed ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-400/10 text-slate-400",
              )}
            >
              {d.executed ? "Executed" : "Unsigned"}
            </span>
          )}
          {d.confidenceScore !== null && (
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/60">
              {Math.round((d.confidenceScore ?? 0) * 100)}%
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

function RenderContractualProvisions({ data }: { data: ContractualProvisionsData | null }) {
  if (!data) return <Empty>No contract provisions extracted yet.</Empty>
  const [expandedClause, setExpandedClause] = useState<string | null>(null)

  const CLAUSE_LABELS: Record<string, string> = {
    governingLaw: "Governing Law",
    jurisdiction: "Jurisdiction",
    arbitration: "Arbitration / ADR",
    venue: "Venue / Forum",
    limitations: "Limitation of Liability",
    indemnification: "Indemnification",
    confidentiality: "Confidentiality",
    termination: "Termination",
    noticePeriod: "Notice",
    curePeriod: "Cure Period",
    forcemajeure: "Force Majeure",
    assignment: "Assignment",
  }

  const presentClauses = data.clauses.filter((c) => c.present)
  const absentClauses = data.clauses.filter((c) => !c.present)

  return (
    <div className="space-y-2">
      {/* Governing law / jurisdiction as prominent text */}
      {(data.governingLaw || data.jurisdiction) && (
        <div className="rounded-lg bg-muted/20 px-3 py-2">
          {data.governingLaw && <DefRow label="Governing Law" value={data.governingLaw} />}
          {data.jurisdiction && <DefRow label="Jurisdiction" value={data.jurisdiction} />}
        </div>
      )}
      {/* Present clauses */}
      {presentClauses.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presentClauses.map((clause) => (
            <button
              key={clause.clauseType}
              onClick={() => setExpandedClause(expandedClause === clause.clauseType ? null : clause.clauseType)}
              className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500 transition-colors hover:bg-emerald-500/20"
            >
              {CLAUSE_LABELS[clause.clauseType] ?? clause.clauseType}
            </button>
          ))}
        </div>
      )}
      {/* Expanded quote */}
      {expandedClause && (() => {
        const clause = data.clauses.find((c) => c.clauseType === expandedClause)
        return clause?.quote ? (
          <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-3 py-2">
            <p className="text-[10px] text-muted-foreground">{clause.documentName}</p>
            <p className="mt-1 text-xs italic leading-relaxed text-foreground/80">"{clause.quote}"</p>
          </div>
        ) : null
      })()}
      {/* Absent clauses */}
      {absentClauses.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {absentClauses.map((clause) => (
            <span
              key={clause.clauseType}
              className="rounded-full border border-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground/50"
            >
              {CLAUSE_LABELS[clause.clauseType] ?? clause.clauseType}
            </span>
          ))}
        </div>
      )}
      {data.clauses.length === 0 && <Empty>No contractual provisions extracted yet.</Empty>}
    </div>
  )
}

function RenderObligationsDuties({ data }: { data: ObligationsDutiesData | null }) {
  if (!data || data.obligations.length === 0) return <Empty>No obligations extracted yet.</Empty>
  return (
    <ul className="space-y-1.5 max-h-48 overflow-y-auto">
      {data.obligations.map((o, i) => (
        <li key={i} className="rounded-lg px-2 py-1.5 hover:bg-muted/10">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {o.obligor && <span className="truncate">{o.obligor}</span>}
            {o.obligor && o.obligee && <span className="shrink-0 text-muted-foreground">→</span>}
            {o.obligee && <span className="truncate">{o.obligee}</span>}
            {!o.obligor && !o.obligee && <span>{o.label}</span>}
          </div>
          {(o.triggerEvent || o.dueDate) && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {o.triggerEvent && <span>{o.triggerEvent}</span>}
              {o.dueDate && <span className="ml-1 font-medium text-amber-400">Due: {o.dueDate}</span>}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

function RenderEventsTimeline({
  data,
  events,
  caseId,
}: {
  data: EventsTimelineData | null
  events: TimelineEvent[]
  caseId: string
}) {
  return (
    <div className="space-y-2">
      {data && (data.eventCount > 0 || data.earliestDate) && (
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>{data.eventCount} events</span>
          {data.earliestDate && <span>From {data.earliestDate}</span>}
          {data.latestDate && data.latestDate !== data.earliestDate && <span>to {data.latestDate}</span>}
          <Link href={`/case/${caseId}/timeline`} className="ml-auto text-primary hover:underline">
            Full timeline →
          </Link>
        </div>
      )}
      {events.length === 0 ? (
        <Empty>No timeline events yet.</Empty>
      ) : (
        <div className="h-20">
          <TimelineStrip events={events.slice(0, 10)} caseId={caseId} />
        </div>
      )}
    </div>
  )
}

function RenderNoticeCure({ data }: { data: NoticeCureData | null }) {
  if (!data) return <Empty>No notice provisions found yet.</Empty>
  return (
    <div className="space-y-1">
      <DefRow label="Notice Required" value={data.noticeRequired === null ? null : data.noticeRequired ? "Yes" : "No"} />
      <DefRow label="Notice Period" value={data.noticePeriodDays ? `${data.noticePeriodDays} days` : null} />
      <DefRow label="Cure Period" value={data.curePeriodDays ? `${data.curePeriodDays} days` : null} />
      <DefRow label="Notice Method" value={data.noticeMethod} />
      <div className="flex items-center gap-2 py-0.5">
        <span className="w-28 shrink-0 text-[10px] text-muted-foreground">Notice Letter</span>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[9px] font-medium",
            data.noticeLetterFound ? "bg-emerald-500/10 text-emerald-500" : "bg-muted/20 text-muted-foreground",
          )}
        >
          {data.noticeLetterFound ? "Found" : "Not found"}
        </span>
      </div>
    </div>
  )
}

function RenderJurisdictionForum({ data }: { data: JurisdictionForumData | null }) {
  if (!data) return <Empty>No jurisdiction information found yet.</Empty>
  return (
    <div className="space-y-2">
      {data.adrVsLitigationInsight && (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold",
              data.adrVsLitigationInsight === "adr"
                ? "bg-blue-500/10 text-blue-400"
                : data.adrVsLitigationInsight === "litigation"
                ? "bg-slate-400/10 text-slate-400"
                : "bg-muted/20 text-muted-foreground",
            )}
          >
            {data.adrVsLitigationInsight === "adr"
              ? "ADR Pathway"
              : data.adrVsLitigationInsight === "litigation"
              ? "Litigation Pathway"
              : "Pathway Unclear"}
          </span>
          {data.arbitrationProvider && (
            <span className="text-[10px] text-muted-foreground">via {data.arbitrationProvider}</span>
          )}
        </div>
      )}
      <DefRow label="Governing Law" value={data.governingLaw} />
      <DefRow label="Jurisdiction" value={data.jurisdiction} />
      <DefRow label="Venue / Forum" value={data.venue} />
    </div>
  )
}

function RenderClaimsCounts({ data }: { data: ClaimsCountsData | null }) {
  if (!data || (data.claims.length === 0 && data.counts.length === 0)) {
    return <Empty>No claims or counts identified yet.</Empty>
  }
  return (
    <div className="space-y-3">
      {data.counts.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Causes of Action ({data.counts.length})
          </p>
          <ul className="space-y-1">
            {data.counts.map((c, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/10">
                <span className="mt-0.5 shrink-0 rounded bg-muted/30 px-1 py-0.5 text-[9px] tabular-nums text-muted-foreground">
                  {c.countNumber}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{c.label}</p>
                  {c.type && <p className="text-[10px] capitalize text-muted-foreground">{c.type.replace(/_/g, " ")}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.claims.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Claims ({data.claims.length})
          </p>
          <ul className="space-y-1">
            {data.claims.map((c) => (
              <li key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted/10">
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                    c.confidence >= 0.8 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-400/10 text-amber-400",
                  )}
                >
                  {Math.round(c.confidence * 100)}%
                </span>
                <span className="flex-1 truncate text-xs">{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function RenderDamages({ data }: { data: DamagesData | null }) {
  if (!data || data.amounts.length === 0) return <Empty>No damages amounts extracted yet.</Empty>
  return (
    <div className="space-y-2">
      {data.totalClaimed !== null && (
        <div className="rounded-lg bg-muted/20 px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Total Claimed (estimated)</p>
          <p className="mt-0.5 text-base font-semibold tabular-nums">
            ${data.totalClaimed.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
      )}
      <ul className="space-y-1 max-h-40 overflow-y-auto">
        {data.amounts.map((a, i) => (
          <li key={i} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted/10">
            <span className="flex-1 truncate text-xs">{a.label}</span>
            {a.amountType && (
              <span className="shrink-0 text-[10px] capitalize text-muted-foreground">{a.amountType.replace(/_/g, " ")}</span>
            )}
            {a.value && <span className="shrink-0 text-xs font-medium tabular-nums">{a.value}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function RenderEvidenceInventory({ data }: { data: EvidenceInventoryData | null }) {
  if (!data) return <Empty>No evidence inventory available yet.</Empty>
  const typeEntries = Object.entries(data.documentsByType).sort((a, b) => b[1] - a[1])
  const maxCount = typeEntries.reduce((m, [, v]) => Math.max(m, v), 1)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium">{data.documentCount} documents</span>
        <span className="text-[10px] text-muted-foreground">{data.evidenceLinks.length} evidence links</span>
      </div>
      {/* Evidence density bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Evidence Density</span>
          <span>{Math.round(data.evidenceDensityScore * 100)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
          <div
            className={cn(
              "h-full rounded-full",
              data.evidenceDensityScore >= 0.7 ? "bg-emerald-500" : data.evidenceDensityScore >= 0.4 ? "bg-amber-400" : "bg-red-400",
            )}
            style={{ width: `${Math.round(data.evidenceDensityScore * 100)}%` }}
          />
        </div>
      </div>
      {/* Document type breakdown — CSS-only bars */}
      {typeEntries.length > 0 && (
        <div className="space-y-1">
          {typeEntries.slice(0, 6).map(([type, count]) => (
            <div key={type} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate text-[10px] text-muted-foreground capitalize">
                {type.replace(/_/g, " ")}
              </span>
              <div className="flex-1 overflow-hidden rounded-full bg-muted/20 h-1.5">
                <div
                  className="h-full rounded-full bg-blue-400/60"
                  style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
                />
              </div>
              <span className="w-4 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RenderSolInputs({ data }: { data: SolInputsData | null }) {
  if (!data) return <Empty>No statute of limitations data available yet.</Empty>

  const daysRemaining = data.daysRemaining
  const breached = data.solBreached

  return (
    <div className="space-y-2">
      {/* SOL countdown chip */}
      {daysRemaining !== null && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2",
            breached
              ? "bg-red-400/10"
              : daysRemaining < 90
              ? "bg-red-400/10"
              : daysRemaining < 365
              ? "bg-amber-400/10"
              : "bg-emerald-500/10",
          )}
        >
          {breached ? (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
          ) : daysRemaining < 365 ? (
            <Clock className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          )}
          <span
            className={cn(
              "text-xs font-semibold",
              breached ? "text-red-400" : daysRemaining < 90 ? "text-red-400" : daysRemaining < 365 ? "text-amber-400" : "text-emerald-500",
            )}
          >
            {breached
              ? "SOL may be breached"
              : `${daysRemaining.toLocaleString()} days remaining`}
          </span>
          {data.statuteOfLimitationsYears && (
            <span className="ml-auto text-[10px] text-muted-foreground">
              {data.statuteOfLimitationsYears}yr SOL
            </span>
          )}
        </div>
      )}
      <DefRow label="Accrual Date" value={data.accrualDate} />
      <DefRow label="Filing Date" value={data.filingDate} />
      <DefRow label="SOL Period" value={data.statuteOfLimitationsYears ? `${data.statuteOfLimitationsYears} years` : null} />
      {data.relevantDates.length > 0 && (
        <div className="mt-1 space-y-0.5">
          <p className="text-[10px] text-muted-foreground">Key Dates</p>
          {data.relevantDates.slice(0, 5).map((d, i) => (
            <DefRow key={i} label={d.label} value={d.value} />
          ))}
        </div>
      )}
    </div>
  )
}
