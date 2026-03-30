"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { useGraph } from "@/hooks/use-graph"
import { NodeDetailPanel } from "./node-detail-panel"
import { ENTITY_TYPE_CONFIG } from "@/lib/constants/entity-types"
import type { KGNode } from "@/lib/types/kg"

// Dynamic import — react-force-graph-2d uses canvas/window, must be client-only
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic<any>(() => import("react-force-graph-2d"), { ssr: false })

interface CaseMapProps {
  caseId: string
}

/**
 * Living Case Map — force-directed KG visualization using react-force-graph-2d.
 *
 * Node sizing: proportional to edge count (1 + connections).
 * Node color: per entity-type dotColor.
 * Click a node → NodeDetailPanel slides in from the right.
 */
export function CaseMap({ caseId }: CaseMapProps) {
  const { graph, isLoading, error } = useGraph(caseId)
  const [selectedNode, setSelectedNode] = useState<KGNode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ width: 800, height: 600 })

  // Track container size via ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setDims({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleNodeClick = useCallback((node: KGNode) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node))
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="animate-pulse text-sm text-muted-foreground">Loading graph…</p>
      </div>
    )
  }

  if (error) return <p className="p-4 text-sm text-red-400">{error}</p>

  const nodes = graph?.nodes ?? []
  const edges = graph?.edges ?? []

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-muted-foreground">
          No knowledge graph data yet. Process documents to populate.
        </p>
      </div>
    )
  }

  // Edge count per node for sizing
  const edgeCounts = new Map<string, number>()
  for (const e of edges) {
    edgeCounts.set(e.source_node_id, (edgeCounts.get(e.source_node_id) ?? 0) + 1)
    edgeCounts.set(e.target_node_id, (edgeCounts.get(e.target_node_id) ?? 0) + 1)
  }

  const graphData = {
    nodes: nodes.map((n) => ({
      ...n,
      id:  n.id,
      val: 1 + (edgeCounts.get(n.id) ?? 0),
    })),
    links: edges.map((e) => ({
      ...e,
      source: e.source_node_id,
      target: e.target_node_id,
    })),
  }

  return (
    <div ref={containerRef} className="relative h-full overflow-hidden">
      {/* Legend */}
      <div className="glass absolute left-3 top-3 z-10 flex flex-col gap-1 rounded-xl p-3">
        <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
          {nodes.length} nodes · {edges.length} edges
        </p>
        {(
          ["party", "claim", "evidence", "obligation", "event"] as const
        ).map((type) => {
          const cfg = ENTITY_TYPE_CONFIG[type]
          return (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: cfg.dotColor }}
              />
              <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
            </div>
          )
        })}
      </div>

      <ForceGraph2D
        graphData={graphData}
        width={dims.width}
        height={dims.height}
        nodeLabel={(node: KGNode) => node.node_label}
        nodeColor={(node: KGNode) =>
          (ENTITY_TYPE_CONFIG[node.node_type] ?? ENTITY_TYPE_CONFIG["party"]).dotColor
        }
        nodeRelSize={5}
        linkColor={() => "rgba(148,163,184,0.25)"}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        onNodeClick={handleNodeClick}
        backgroundColor="transparent"
        cooldownTime={3000}
        nodeCanvasObjectMode={() => "after"}
        nodeCanvasObject={(node: KGNode & { x?: number; y?: number }, ctx: CanvasRenderingContext2D) => {
          if (node.x == null || node.y == null) return
          const label = node.node_label
          if (!label) return
          ctx.font = "4px Inter, system-ui, sans-serif"
          ctx.fillStyle = "rgba(226,232,240,0.85)"
          ctx.textAlign = "center"
          ctx.fillText(label.slice(0, 24), node.x, node.y + 9)
        }}
      />

      {/* Node detail panel */}
      <NodeDetailPanel
        node={selectedNode}
        caseId={caseId}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  )
}
