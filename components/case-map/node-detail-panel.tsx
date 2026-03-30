"use client"

import Link from "next/link"
import { X } from "lucide-react"
import type { KGNode } from "@/lib/types/kg"
import { ENTITY_TYPE_CONFIG } from "@/lib/constants/entity-types"
import { cn } from "@/lib/utils"

interface NodeDetailPanelProps {
  node: KGNode | null
  caseId: string
  onClose: () => void
}

const SKIP_PROPS = new Set([
  "confidence",
  "date_sort_key",
  "is_relative",
  "reference_event",
  "aliases",
])

export function NodeDetailPanel({ node, caseId, onClose }: NodeDetailPanelProps) {
  if (!node) return null

  const config     = ENTITY_TYPE_CONFIG[node.node_type] ?? ENTITY_TYPE_CONFIG["party"]
  const confidence = (node.properties?.confidence as number) ?? 1

  const workspaceUrl = node.document_id
    ? `/case/${caseId}/workspace?doc=${node.document_id}${
        node.source_section_id ? `&section=${node.source_section_id}` : ""
      }`
    : null

  const displayProps = Object.entries(node.properties ?? {}).filter(
    ([k, v]) => !SKIP_PROPS.has(k) && v != null && v !== "",
  )

  return (
    <div
      className="glass absolute right-3 top-3 z-20 w-72 rounded-xl p-4 shadow-xl"
      style={{ animation: "slideInRight 0.18s ease-out" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{
              color: config.dotColor,
              backgroundColor: `${config.dotColor}1a`,
            }}
          >
            {config.label}
          </span>
          <p className="mt-1.5 text-sm font-semibold leading-snug">{node.node_label}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          title="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="mt-3 space-y-2 border-t border-border/30 pt-3 text-xs">
        {/* Confidence */}
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Confidence:</span>
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
        {displayProps.slice(0, 6).map(([k, v]) => (
          <div key={k} className="flex items-start gap-1">
            <span className="shrink-0 capitalize text-muted-foreground">
              {k.replace(/_/g, " ")}:
            </span>
            <span className="truncate font-medium">
              {Array.isArray(v) ? v.join(", ") : String(v)}
            </span>
          </div>
        ))}

        {/* View in document */}
        {workspaceUrl ? (
          <Link
            href={workspaceUrl}
            className="mt-2 flex items-center gap-1 rounded px-2 py-1.5 text-primary transition-colors hover:bg-primary/5"
          >
            View in document
            <span className="ml-auto text-[10px]">→</span>
          </Link>
        ) : (
          <p className="text-[10px] text-muted-foreground/50">No source document linked.</p>
        )}
      </div>
    </div>
  )
}
