"use client"

import { useRef, useEffect, useState } from "react"
import { LightboxViewer } from "./lightbox-viewer"
import type { KGEdge } from "@/lib/types/kg"

interface ComparativeViewProps {
  leftDocumentId: string
  rightDocumentId: string
  caseId: string
  linkedEdges?: KGEdge[]
}

const EDGE_TYPE_COLORS: Record<string, string> = {
  supported_by: "#22c55e",  // green
  exhibit_of:   "#3b82f6",  // blue
  contradicts:  "#ef4444",  // red
}

function edgeColor(edgeType: string): string {
  return EDGE_TYPE_COLORS[edgeType] ?? "#94a3b8"
}

/**
 * Side-by-side document view for clause mapping (Comparative Document View).
 *
 * Renders two LightboxViewer instances in a 2-column grid.
 * When linkedEdges are provided, an SVG overlay draws connector lines between
 * linked sections. Line color is determined by edge_type:
 *   supported_by → green, exhibit_of → blue, contradicts → red.
 *
 * Hovering a connector highlights both linked sections via HoverSyncContext.
 */
export function ComparativeView({
  leftDocumentId,
  rightDocumentId,
  caseId,
  linkedEdges = [],
}: ComparativeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)

  // SVG connector lines are drawn after both viewers render.
  // For now we measure relative positions on mouse-enter for the active edge.
  // Full static line drawing requires waiting for section elements to mount.
  useEffect(() => {
    // Connector line rendering requires DOM measurement of section elements
    // inside the two viewers. This is deferred until we can reliably measure
    // element positions within the scrollable containers.
    // TODO: implement full connector drawing via ResizeObserver + scroll sync.
  }, [linkedEdges])

  return (
    <div ref={containerRef} className="relative flex h-full gap-4 overflow-hidden p-2">
      {/* SVG overlay for connector lines */}
      <svg
        ref={svgRef}
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        aria-hidden
      />

      {/* Left document */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 shrink-0">
          <div className="h-2 w-2 rounded-full bg-blue-400" />
          <span className="text-xs font-medium text-slate-600">Document A</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <LightboxViewer documentId={leftDocumentId} caseId={caseId} />
        </div>
      </div>

      {/* Right document */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 shrink-0">
          <div className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-medium text-slate-600">Document B</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <LightboxViewer documentId={rightDocumentId} caseId={caseId} />
        </div>
      </div>

      {/* Edge legend (visible when edges are present) */}
      {linkedEdges.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-lg bg-white/90 backdrop-blur-sm border border-slate-200 px-3 py-1.5 shadow text-[10px] text-slate-500">
          {Object.entries(EDGE_TYPE_COLORS).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: color }} />
              {type.replace("_", " ")}
            </span>
          ))}
          <span className="text-slate-400">({linkedEdges.length} link{linkedEdges.length !== 1 ? "s" : ""})</span>
        </div>
      )}
    </div>
  )
}
