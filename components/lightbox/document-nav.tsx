"use client"

import { useMemo } from "react"
import type { Section } from "@/lib/types/section"
import { cn } from "@/lib/utils"

interface DocumentNavProps {
  sections: Section[]
  activeSectionId?: string
  /** Section IDs currently cited in the last AI response — shown with green glow */
  highlightedSectionIds?: string[]
  onSelect: (sectionId: string, anchorId?: string | null) => void
  onToggle?: () => void
}

interface SectionNode extends Section {
  children: SectionNode[]
}

function buildTree(sections: Section[]): SectionNode[] {
  const nodeMap = new Map<string, SectionNode>()
  const roots: SectionNode[] = []

  for (const s of sections) {
    nodeMap.set(s.id, { ...s, children: [] })
  }
  for (const s of sections) {
    const node = nodeMap.get(s.id)!
    if (s.parent_section_id && nodeMap.has(s.parent_section_id)) {
      nodeMap.get(s.parent_section_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

function NavItem({
  node,
  activeSectionId,
  highlightedIds,
  onSelect,
  depth,
}: {
  node: SectionNode
  activeSectionId?: string
  highlightedIds?: Set<string>
  onSelect: (sectionId: string, anchorId?: string | null) => void
  depth: number
}) {
  const isActive = activeSectionId === node.id
  const isHighlighted = highlightedIds?.has(node.id) ?? false

  return (
    <>
      <li>
        <button
          type="button"
          onClick={() => onSelect(node.id, node.anchor_id)}
          className={cn(
            "w-full text-left py-0.5 pr-2 rounded text-[11px] leading-tight transition-all flex items-center gap-1.5",
            depth === 0 ? "font-medium text-slate-700" : "text-slate-500",
            isActive
              ? "font-semibold text-slate-900"
              : "hover:bg-slate-100 hover:text-slate-800",
            isHighlighted && !isActive && "bg-emerald-50 text-emerald-700 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.4)]",
          )}
          style={{ paddingLeft: `${depth * 8 + 8}px` }}
          title={node.section_title ?? "Untitled"}
        >
          {isHighlighted && (
            <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
          )}
          <span className="block max-w-[180px] truncate">{node.section_title ?? "Untitled"}</span>
        </button>
      </li>
      {node.children.map((child) => (
        <NavItem
          key={child.id}
          node={child}
          activeSectionId={activeSectionId}
          highlightedIds={highlightedIds}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </>
  )
}

/**
 * Collapsible TOC sidebar inside the Light-Box.
 * Builds a tree from flat sections[] using parent_section_id.
 */
export function DocumentNav({
  sections,
  activeSectionId,
  highlightedSectionIds,
  onSelect,
  onToggle,
}: DocumentNavProps) {
  const tree = useMemo(() => buildTree(sections), [sections])
  const highlightedIds = useMemo(
    () => new Set(highlightedSectionIds ?? []),
    [highlightedSectionIds],
  )

  return (
    <nav className="flex h-full w-48 max-w-[192px] flex-col bg-slate-50 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Contents
        </span>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="text-[10px] text-slate-400 hover:text-slate-700 transition-colors"
            title="Collapse TOC"
          >
            ◂
          </button>
        )}
      </div>

      <ul className="flex-1 overflow-y-auto py-1 space-y-0 px-1">
        {tree.length === 0 ? (
          <li className="px-3 py-2 text-[10px] text-slate-400 italic">No sections</li>
        ) : (
          tree.map((node) => (
            <NavItem
              key={node.id}
              node={node}
              activeSectionId={activeSectionId}
              highlightedIds={highlightedIds}
              onSelect={onSelect}
              depth={0}
            />
          ))
        )}
      </ul>
    </nav>
  )
}
