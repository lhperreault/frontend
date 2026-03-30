"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { KnowledgeShelf } from "@/components/knowledge-shelf/knowledge-shelf"
import { LegalPad } from "@/components/legal-pad/legal-pad"
import { HoverSyncProvider } from "@/providers/hover-sync-provider"
import { cn } from "@/lib/utils"

type PanelId = "shelf" | "lightbox" | "pad"

interface PanelWidths {
  shelf:    number // flex-basis in %
  lightbox: number
  pad:      number
}

const DEFAULT_WIDTHS: PanelWidths = { shelf: 22, lightbox: 48, pad: 30 }

interface PanelLayoutProps {
  caseId: string
  /** Optional center content — defaults to a placeholder until a document is selected */
  centerContent?: React.ReactNode
}

/**
 * Panel Layout — resizable 3-column workspace.
 *
 * ┌─────────────┬──────────────────────┬────────────────┐
 * │ Knowledge   │  Light-Box Viewer    │  Legal Pad     │
 * │ Shelf       │  (center stage)      │  (HITL + Chat) │
 * └─────────────┴──────────────────────┴────────────────┘
 *
 * Panels can be collapsed. The center expands to fill.
 * Full drag-resize wired in Phase 5 — widths held in local state for now.
 */
export function PanelLayout({ caseId, centerContent }: PanelLayoutProps) {
  const [widths] = useState<PanelWidths>(DEFAULT_WIDTHS)
  const [collapsed, setCollapsed] = useState<Set<PanelId>>(new Set())

  const toggleCollapse = (id: PanelId) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <HoverSyncProvider>
    <div className="flex h-full overflow-hidden">
      {/* Knowledge Shelf */}
      <Panel
        id="shelf"
        title="Knowledge Shelf"
        collapsed={collapsed.has("shelf")}
        onToggle={() => toggleCollapse("shelf")}
        width={collapsed.has("shelf") ? 2.5 : widths.shelf}
        side="left"
      >
        <KnowledgeShelf caseId={caseId} />
      </Panel>

      {/* Light-Box Viewer */}
      <Panel
        id="lightbox"
        title="Document Viewer"
        collapsed={false}
        onToggle={() => {}}
        width={
          widths.lightbox +
          (collapsed.has("shelf") ? widths.shelf - 2.5 : 0) +
          (collapsed.has("pad")   ? widths.pad   - 2.5 : 0)
        }
        side="center"
      >
        {centerContent ?? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium text-muted-foreground">No document open</p>
            <p className="text-xs text-muted-foreground/60">
              Select a document from the Knowledge Shelf to view it here.
            </p>
          </div>
        )}
      </Panel>

      {/* Legal Pad */}
      <Panel
        id="pad"
        title="Legal Pad"
        collapsed={collapsed.has("pad")}
        onToggle={() => toggleCollapse("pad")}
        width={collapsed.has("pad") ? 2.5 : widths.pad}
        side="right"
      >
        <LegalPad caseId={caseId} />
      </Panel>
    </div>
    </HoverSyncProvider>
  )
}

function Panel({
  title,
  collapsed,
  onToggle,
  width,
  side,
  children,
}: {
  id: PanelId
  title: string
  collapsed: boolean
  onToggle: () => void
  width: number
  side: "left" | "center" | "right"
  children: React.ReactNode
}) {
  return (
    <motion.div
      layout
      style={{ flexBasis: `${width}%`, flexShrink: 0 }}
      className={cn(
        "flex flex-col h-full overflow-hidden",
        side !== "center" && "border-border/30",
        side === "left"   && "border-r",
        side === "right"  && "border-l",
      )}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Panel header */}
      <div
        className="flex h-8 shrink-0 cursor-pointer select-none items-center justify-between border-b border-border/20 bg-muted/20 px-3"
        onClick={onToggle}
      >
        {!collapsed && (
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
        )}
        <button className="ml-auto text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground">
          {side === "left"  ? (collapsed ? "›" : "‹") : ""}
          {side === "right" ? (collapsed ? "‹" : "›") : ""}
        </button>
      </div>

      {/* Panel body */}
      {!collapsed && (
        <div className="flex-1 overflow-auto scrollbar-none">
          {children}
        </div>
      )}
    </motion.div>
  )
}
