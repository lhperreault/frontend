"use client"

import { useRef } from "react"
import type { KGNodeGrouped } from "@/lib/types/kg"
import type { Section } from "@/lib/types/section"
import { EntityCard } from "./entity-card"

interface EntityCardDraggableProps {
  node: KGNodeGrouped
  isSelected?: boolean
  onClick?: (node: KGNodeGrouped) => void
  caseId?: string
  sections?: Section[]
}

/**
 * Wraps EntityCard with HTML5 drag-and-drop so nodes can be dropped
 * onto the LightBox or Legal Pad to create references.
 */
export function EntityCardDraggable({ node, isSelected, onClick, caseId, sections }: EntityCardDraggableProps) {
  const dragRef = useRef<HTMLDivElement>(null)

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "copy"
    e.dataTransfer.setData("application/json", JSON.stringify(node))
    e.dataTransfer.setData("text/plain", node.node_label)
  }

  return (
    <div
      ref={dragRef}
      draggable
      onDragStart={handleDragStart}
      className="cursor-grab active:cursor-grabbing"
    >
      <EntityCard node={node} isSelected={isSelected} onClick={onClick} caseId={caseId} sections={sections} />
    </div>
  )
}
