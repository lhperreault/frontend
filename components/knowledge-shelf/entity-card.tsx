"use client"

import { useState, useEffect } from "react"
import { ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { KGNode, KGNodeGrouped } from "@/lib/types/kg"
import type { Section } from "@/lib/types/section"
import { ENTITY_TYPE_CONFIG } from "@/lib/constants/entity-types"
import { confidenceToOpacity, confidenceToLabel } from "@/lib/utils/confidence"
import { useHoverSync } from "@/hooks/use-hover-sync"
import { EntityMinimap } from "./entity-minimap"
import { cn } from "@/lib/utils"

interface EntityCardProps {
  node: KGNodeGrouped
  isSelected?: boolean
  onClick?: (node: KGNodeGrouped) => void
  /** When provided, "Jump to source" links navigate to the workspace */
  caseId?: string
  /**
   * Sections of the current document — when provided, the minimap strip
   * is shown and the navigate button scrolls via HoverSyncContext.
   */
  sections?: Section[]
}

function workspaceUrl(caseId: string, docId: string, sectionId: string | null) {
  const p = new URLSearchParams({ doc: docId })
  if (sectionId) p.set("section", sectionId)
  return `/case/${caseId}/workspace?${p.toString()}`
}

/**
 * Entity card with an expandable detail panel.
 *
 * Header layout:
 *   [minimap 6px] [color dot] [entity name] [N docs] [type pill] [navigate ▶] [chevron ▼]
 *
 * - Click body/chevron → expand/collapse detail panel
 * - Click navigate (▶) → scroll LightBox to entity's source section via HoverSyncContext
 * - Click minimap tick → scroll LightBox to that specific section
 */
export function EntityCard({ node, isSelected, onClick, caseId, sections }: EntityCardProps) {
  const config     = ENTITY_TYPE_CONFIG[node.node_type] ?? ENTITY_TYPE_CONFIG["party"]
  const confidence = (node.properties?.confidence as number | undefined) ?? 1
  const instances  = node.instances ?? []
  const aliases    = Array.isArray(node.properties?.aliases)
    ? (node.properties.aliases as string[])
    : []

  const [isExpanded, setIsExpanded] = useState(false)
  const [docNames, setDocNames]     = useState<Record<string, string>>({})

  const { setHoverTarget } = useHoverSync()

  // Lazy-fetch document names the first time the card is expanded
  useEffect(() => {
    if (!isExpanded || !caseId) return
    const ids = [node.document_id, ...instances.map((n) => n.document_id)].filter(
      (id): id is string => !!id && !docNames[id],
    )
    if (!ids.length) return

    createClient()
      .from("documents")
      .select("id, file_name")
      .in("id", ids)
      .then(({ data }) => {
        if (!data?.length) return
        setDocNames((prev) => {
          const next = { ...prev }
          for (const d of data) next[d.id] = d.file_name
          return next
        })
      })
  }, [isExpanded, caseId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleHeaderClick = () => {
    setIsExpanded((v) => !v)
    onClick?.(node)
  }

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!node.source_section_id) return
    // Look up anchor_id from sections for precise XHTML scrolling
    const anchor = sections?.find((s) => s.id === node.source_section_id)?.anchor_id
    setHoverTarget(node.source_section_id, anchor ?? undefined)
  }

  const SKIP = new Set([
    "confidence", "date_value", "date_sort_key", "is_relative", "reference_event",
  ])
  const displayProps = Object.entries(node.properties ?? {}).filter(
    ([k, v]) => !SKIP.has(k) && v != null && v !== "",
  )

  const totalDocs     = 1 + instances.length
  const showMinimap   = !!sections && sections.length > 0
  const canNavigate   = !!node.source_section_id

  return (
    <div
      className={cn(
        "glass w-full overflow-hidden rounded-lg transition-colors",
        confidenceToOpacity(confidence),
        isSelected ? "ring-1 ring-primary" : "",
      )}
    >
      {/* ── Header row (always visible) ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleHeaderClick}
        onKeyDown={(e) => e.key === "Enter" && handleHeaderClick()}
        className="flex cursor-pointer items-center gap-1.5 px-2 py-2.5 hover:bg-muted/10"
      >
        {/* Minimap strip — only in document-scoped mode */}
        {showMinimap && (
          <EntityMinimap
            entityName={node.node_label}
            aliases={aliases}
            sections={sections}
          />
        )}

        {/* Type color dot */}
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: config.dotColor }}
        />

        {/* Entity name */}
        <span className="min-w-0 flex-1 truncate text-xs font-medium">
          {node.node_label}
        </span>

        {/* Cross-doc badge */}
        {totalDocs > 1 && (
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
            {totalDocs}
          </span>
        )}

        {/* Type pill */}
        <span
          className="shrink-0 rounded px-1 py-0.5 text-[10px] font-medium"
          style={{ color: config.dotColor, backgroundColor: `${config.dotColor}1a` }}
        >
          {config.label}
        </span>

        {/* Navigate to source button */}
        {canNavigate && (
          <button
            type="button"
            title="Scroll to in document"
            onClick={handleNavigate}
            className="shrink-0 rounded p-0.5 text-muted-foreground/40 transition-colors hover:bg-muted/20 hover:text-primary"
          >
            <ArrowRight className="h-3 w-3" />
          </button>
        )}

        {/* Expand chevron */}
        <svg
          className={cn(
            "h-3 w-3 shrink-0 text-muted-foreground/50 transition-transform",
            isExpanded && "rotate-180",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Confidence sub-label when < 85% */}
      {confidence < 0.85 && !isExpanded && (
        <p className="px-3 pb-2 pl-7 text-[10px] text-muted-foreground">
          {confidenceToLabel(confidence)} confidence
        </p>
      )}

      {/* ── Expanded detail panel ── */}
      {isExpanded && (
        <div className="space-y-2.5 border-t border-border/20 px-3 py-2.5 text-xs">
          {/* Confidence */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>Confidence:</span>
            <span
              className={cn(
                "font-medium tabular-nums",
                confidence >= 0.85
                  ? "text-emerald-500"
                  : confidence >= 0.7
                  ? "text-amber-500"
                  : "text-slate-400",
              )}
            >
              {(confidence * 100).toFixed(0)}%
            </span>
          </div>

          {/* Properties */}
          {displayProps.map(([key, value]) => (
            <div key={key} className="flex items-start gap-1.5">
              <span className="shrink-0 capitalize text-muted-foreground">
                {key.replace(/_/g, " ")}:
              </span>
              <span className="truncate font-medium text-foreground/80">
                {Array.isArray(value) ? value.join(", ") : String(value)}
              </span>
            </div>
          ))}

          {/* Source links */}
          <div className="space-y-1 pt-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
              Source{totalDocs > 1 ? "s" : ""}
            </p>

            {caseId && node.document_id ? (
              <a
                href={workspaceUrl(caseId, node.document_id, node.source_section_id)}
                className="flex items-center gap-1.5 rounded px-2 py-1 text-primary transition-colors hover:bg-primary/5"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="truncate">
                  {docNames[node.document_id] ?? "Document"}
                </span>
                <span className="ml-auto shrink-0 text-[10px]">→</span>
              </a>
            ) : null}

            {instances.map((inst, i) =>
              caseId && inst.document_id ? (
                <a
                  key={i}
                  href={workspaceUrl(caseId, inst.document_id, inst.source_section_id)}
                  className="flex items-center gap-1.5 rounded px-2 py-1 text-primary transition-colors hover:bg-primary/5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="truncate">
                    {docNames[inst.document_id] ?? "Document"}
                  </span>
                  <span className="ml-auto shrink-0 text-[10px]">→</span>
                </a>
              ) : null,
            )}

            {!node.document_id && instances.length === 0 && (
              <p className="text-muted-foreground/50">No source linked.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
