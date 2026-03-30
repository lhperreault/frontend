"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useEntities } from "@/hooks/use-entities"
import { createClient } from "@/lib/supabase/client"
import { EntityCardDraggable } from "./entity-card-draggable"
import { EntityFilter } from "./entity-filter"
import type { KGNodeGrouped, NodeType } from "@/lib/types/kg"
import type { Section } from "@/lib/types/section"
import { ENTITY_TYPE_CONFIG } from "@/lib/constants/entity-types"

interface KnowledgeShelfProps {
  caseId: string
  onNodeSelect?: (node: KGNodeGrouped) => void
}

const ALL_TYPES = new Set(Object.keys(ENTITY_TYPE_CONFIG) as NodeType[])

export function KnowledgeShelf({ caseId, onNodeSelect }: KnowledgeShelfProps) {
  const searchParams = useSearchParams()
  const currentDocId = searchParams.get("doc")

  const { entities, isLoading, error } = useEntities(caseId)
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [activeTypes, setActiveTypes] = useState<Set<NodeType>>(ALL_TYPES)
  const [search, setSearch]           = useState("")
  const [showLowConf, setShowLowConf] = useState(true)
  const [scopeDoc, setScopeDoc]       = useState(true) // true = "This Document"

  // Sections for the current document — fetched lazily when a doc is open
  const [sections, setSections] = useState<Section[]>([])

  useEffect(() => {
    if (!currentDocId) {
      setSections([])
      return
    }
    createClient()
      .from("sections")
      .select(
        "id, document_id, section_title, section_text, level, page_range, start_page, end_page, is_synthetic, anchor_id, parent_section_id, semantic_label, semantic_confidence, label_source",
      )
      .eq("document_id", currentDocId)
      .order("start_page", { ascending: true })
      .then(({ data }) => setSections((data as Section[]) ?? []))
  }, [currentDocId])

  // When no doc is open, force "All" mode
  const effectiveScopeDoc = scopeDoc && !!currentDocId

  const handleClick = (node: KGNodeGrouped) => {
    setSelectedId(node.id)
    onNodeSelect?.(node)
  }

  const toggleType = (type: NodeType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  const filtered = useMemo(() => {
    return entities.filter((n) => {
      if (activeTypes.size > 0 && !activeTypes.has(n.node_type)) return false
      if (search && !n.node_label.toLowerCase().includes(search.toLowerCase())) return false
      if (!showLowConf) {
        const conf = (n.properties?.confidence as number) ?? 1
        if (conf < 0.7) return false
      }
      // Document scoping: keep node if its doc or any instance's doc matches
      if (effectiveScopeDoc && currentDocId) {
        const inDoc =
          n.document_id === currentDocId ||
          (n.instances ?? []).some((inst) => inst.document_id === currentDocId)
        if (!inDoc) return false
      }
      return true
    })
  }, [entities, activeTypes, search, showLowConf, effectiveScopeDoc, currentDocId])

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-3">
      {/* Header + scope toggle */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Entities
        </p>
        {currentDocId && (
          <div className="flex rounded-md border border-border/40 text-[10px]">
            <button
              type="button"
              onClick={() => setScopeDoc(true)}
              className={
                scopeDoc
                  ? "rounded-l-md bg-primary/10 px-2 py-0.5 font-medium text-primary"
                  : "rounded-l-md px-2 py-0.5 text-muted-foreground hover:bg-muted/20"
              }
            >
              This doc
            </button>
            <button
              type="button"
              onClick={() => setScopeDoc(false)}
              className={
                !scopeDoc
                  ? "rounded-r-md bg-primary/10 px-2 py-0.5 font-medium text-primary"
                  : "rounded-r-md px-2 py-0.5 text-muted-foreground hover:bg-muted/20"
              }
            >
              All
            </button>
          </div>
        )}
      </div>

      <EntityFilter
        activeTypes={activeTypes}
        onToggle={toggleType}
        search={search}
        onSearchChange={setSearch}
        showLowConf={showLowConf}
        onToggleLowConf={() => setShowLowConf((v) => !v)}
      />

      <div className="flex-1 space-y-1.5 overflow-y-auto pr-0.5">
        {isLoading && (
          <div className="space-y-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass h-10 animate-pulse rounded-lg" />
            ))}
          </div>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!isLoading && !error && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {effectiveScopeDoc
              ? "No entities found in this document."
              : "No entities match the current filter."}
          </p>
        )}
        {filtered.map((node) => (
          <EntityCardDraggable
            key={node.id}
            node={node}
            isSelected={selectedId === node.id}
            onClick={handleClick}
            caseId={caseId}
            sections={effectiveScopeDoc ? sections : undefined}
          />
        ))}
      </div>
    </div>
  )
}
