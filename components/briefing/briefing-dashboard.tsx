"use client"

import Link from "next/link"
import { useEntities } from "@/hooks/use-entities"
import { useGraph } from "@/hooks/use-graph"
import { useTimeline } from "@/hooks/use-timeline"
import { TimelineStrip } from "@/components/chronology/timeline-strip"
import { cn } from "@/lib/utils"

interface BriefingDashboardProps {
  caseId: string
}

export function BriefingDashboard({ caseId }: BriefingDashboardProps) {
  const { entities, isLoading: entLoading } = useEntities(caseId)
  const { graph, isLoading: graphLoading } = useGraph(caseId)
  const { events, isLoading: timeLoading } = useTimeline(caseId)

  const isLoading = entLoading || graphLoading

  const parties     = entities.filter((e) => e.node_type === "party")
  const claims      = entities.filter((e) => e.node_type === "claim")
  const obligations = entities.filter((e) => e.node_type === "obligation")
  const edges       = graph?.edges ?? []

  // Evidence count per claim node
  const evidenceByClaimId = new Map<string, number>()
  for (const edge of edges) {
    if (edge.edge_type === "supported_by") {
      evidenceByClaimId.set(
        edge.target_node_id,
        (evidenceByClaimId.get(edge.target_node_id) ?? 0) + 1,
      )
    }
  }

  // Risk data
  const unsupportedClaims   = claims.filter((c) => (evidenceByClaimId.get(c.id) ?? 0) === 0)
  const lowConfCount        = entities.filter(
    (e) => ((e.properties?.confidence as number) ?? 1) < 0.7,
  ).length
  const today     = new Date()
  const in30Days  = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  const deadlines = obligations.filter((o) => {
    const dv = o.properties?.date_value as string | undefined
    if (!dv) return false
    const d = new Date(dv)
    return !isNaN(d.getTime()) && d >= today && d <= in30Days
  })

  // "Not ready" state — pipeline hasn't produced any KG nodes yet
  if (!isLoading && entities.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <div className="glass max-w-lg space-y-4 rounded-2xl p-8 text-center">
          <p className="text-sm font-medium">Case briefing not yet available</p>
          <p className="text-xs text-muted-foreground">
            Case briefing will be generated after document processing completes.
          </p>
          {/* Preview skeleton */}
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

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">Case Briefing</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isLoading
            ? "Loading…"
            : `${parties.length} parties · ${claims.length} claims · ${events.length} events`}
        </p>
      </div>

      {/* 2 × 2 grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 1. Parties */}
        <BriefingCard
          title="Parties"
          linkHref={`/case/${caseId}/map`}
          linkLabel="View on map →"
        >
          {isLoading ? (
            <Skeleton rows={3} />
          ) : parties.length === 0 ? (
            <Empty>No parties identified yet.</Empty>
          ) : (
            <ul className="space-y-1">
              {parties.map((p) => {
                const conf = (p.properties?.confidence as number) ?? 1
                const role =
                  (p.properties?.role as string) ??
                  (p.properties?.party_type as string) ??
                  ""
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/10"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: "#60a5fa" }}
                    />
                    <span className="flex-1 truncate text-xs font-medium">
                      {p.node_label}
                    </span>
                    {role && (
                      <span className="shrink-0 text-[10px] capitalize text-muted-foreground">
                        {role}
                      </span>
                    )}
                    <span
                      className={cn(
                        "shrink-0 text-[10px] tabular-nums",
                        conf >= 0.85
                          ? "text-emerald-500"
                          : conf >= 0.7
                          ? "text-amber-500"
                          : "text-slate-400",
                      )}
                    >
                      {(conf * 100).toFixed(0)}%
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </BriefingCard>

        {/* 2. Claims & Evidence */}
        <BriefingCard
          title="Claims & Evidence"
          linkHref={`/case/${caseId}/board`}
          linkLabel="View board →"
        >
          {isLoading ? (
            <Skeleton rows={3} />
          ) : claims.length === 0 ? (
            <Empty>No claims identified yet.</Empty>
          ) : (
            <ul className="space-y-1">
              {claims.map((c) => {
                const evCount    = evidenceByClaimId.get(c.id) ?? 0
                const unsupported = evCount === 0
                return (
                  <li key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        unsupported ? "bg-red-400" : "bg-emerald-400",
                      )}
                    />
                    <span className="flex-1 truncate text-xs">{c.node_label}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                        unsupported
                          ? "bg-red-500/10 text-red-400"
                          : "bg-emerald-500/10 text-emerald-500",
                      )}
                    >
                      {unsupported ? "No evidence" : `${evCount} evidence`}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </BriefingCard>

        {/* 3. Timeline snapshot */}
        <BriefingCard
          title="Timeline Snapshot"
          linkHref={`/case/${caseId}/timeline`}
          linkLabel="Full timeline →"
        >
          {timeLoading ? (
            <Skeleton rows={1} />
          ) : events.length === 0 ? (
            <Empty>No timeline events yet.</Empty>
          ) : (
            <div className="h-20">
              <TimelineStrip events={events.slice(0, 10)} caseId={caseId} />
            </div>
          )}
        </BriefingCard>

        {/* 4. Risk flags */}
        <BriefingCard
          title="Risk Flags"
          linkHref={`/case/${caseId}/review`}
          linkLabel="Review queue →"
        >
          {isLoading ? (
            <Skeleton rows={3} />
          ) : (
            <div className="space-y-2.5">
              <RiskFlag
                count={unsupportedClaims.length}
                label="unsupported claim"
                severity={unsupportedClaims.length > 0 ? "high" : "ok"}
              />
              <RiskFlag
                count={lowConfCount}
                label="low-confidence extraction"
                severity={
                  lowConfCount > 5 ? "high" : lowConfCount > 0 ? "medium" : "ok"
                }
              />
              <RiskFlag
                count={deadlines.length}
                label="obligation due in 30 days"
                severity={deadlines.length > 0 ? "high" : "ok"}
              />
            </div>
          )}
        </BriefingCard>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BriefingCard({
  title,
  linkHref,
  linkLabel,
  children,
}: {
  title: string
  linkHref: string
  linkLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="glass flex flex-col gap-3 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        <Link href={linkHref} className="text-[10px] text-primary hover:underline">
          {linkLabel}
        </Link>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-7 animate-pulse rounded-lg bg-muted/50" />
      ))}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}

function RiskFlag({
  count,
  label,
  severity,
}: {
  count: number
  label: string
  severity: "ok" | "medium" | "high"
}) {
  const colors = {
    ok:     "bg-emerald-500/10 text-emerald-500",
    medium: "bg-amber-400/10 text-amber-400",
    high:   "bg-red-400/10 text-red-400",
  }
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
          colors[severity],
        )}
      >
        {count}
      </span>
      <span className="text-xs text-muted-foreground">
        {label}
        {count !== 1 ? "s" : ""}
      </span>
    </div>
  )
}
