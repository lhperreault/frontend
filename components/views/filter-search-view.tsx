"use client"

import { useState, useMemo, useEffect } from "react"
import { useWorkspace } from "@/providers/workspace-provider"
import { useHoverSync } from "@/providers/hover-sync-provider"
import { useEntities } from "@/hooks/use-entities"
import { createClient } from "@/lib/supabase/client"
import { EntityCardDraggable } from "@/components/knowledge-shelf/entity-card-draggable"
import { EntityFilter } from "@/components/knowledge-shelf/entity-filter"
import type { KGNodeGrouped, NodeType } from "@/lib/types/kg"
import type { Section } from "@/lib/types/section"
import { ENTITY_TYPE_CONFIG } from "@/lib/constants/entity-types"

const ALL_TYPES = new Set(Object.keys(ENTITY_TYPE_CONFIG) as NodeType[])

export function FilterSearchView({ caseId }: { caseId: string }) {
  const { activeDocumentId, setEntityHoverTarget, entityDocFilter, setEntityDocFilter } = useWorkspace()
  const { setHoverTarget, clearHoverTarget } = useHoverSync()

  const { entities, isLoading, error } = useEntities(caseId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTypes, setActiveTypes] = useState<Set<NodeType>>(ALL_TYPES)
  const [search, setSearch] = useState("")
  const [showLowConf, setShowLowConf] = useState(true)
  const [scopeDoc, setScopeDoc] = useState(true)

  const [sections, setSections] = useState<Section[]>([])

  // Fetch sections for the active document for entity-card context
  useEffect(() => {
    if (!activeDocumentId) {
      setSections([])
      return
    }
    createClient()
      .from("sections")
      .select(
        "id, document_id, section_title, section_text, level, page_range, start_page, end_page, is_synthetic, anchor_id, parent_section_id, semantic_label, semantic_confidence, label_source",
      )
      .eq("document_id", activeDocumentId)
      .order("start_page", { ascending: true })
      .then(({ data }) => setSections((data as Section[]) ?? []))
  }, [activeDocumentId])

  const effectiveScopeDoc = scopeDoc && !!activeDocumentId

  const handleClick = (node: KGNodeGrouped) => {
    setSelectedId(node.id)
    // Hover-sync: scroll + highlight the source section in the Document view
    const sectionId = node.source_section_id ?? node.instances?.[0]?.source_section_id
    if (sectionId) setHoverTarget(sectionId)
    // Entity context: expose to AI Chat so user can include it in their next message
    setEntityHoverTarget({ id: node.id, label: node.node_label, nodeType: node.node_type })
    // Doc filter: toggle — clicking the same entity again clears the filter
    const target = { id: node.id, label: node.node_label, nodeType: node.node_type }
    setEntityDocFilter(entityDocFilter?.id === node.id ? null : target)
  }

  const handleMouseLeave = () => {
    clearHoverTarget()
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
      if (search && !n.node_label.toLowerCase().includes(search.toLowerCase()))
        return false
      if (!showLowConf) {
        const conf = (n.properties?.confidence as number) ?? 1
        if (conf < 0.7) return false
      }
      if (effectiveScopeDoc && activeDocumentId) {
        const inDoc =
          n.document_id === activeDocumentId ||
          (n.instances ?? []).some((inst) => inst.document_id === activeDocumentId)
        if (!inDoc) return false
      }
      return true
    })
  }, [entities, activeTypes, search, showLowConf, effectiveScopeDoc, activeDocumentId])

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-3">
      {/* Header + scope toggle */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Entities
        </p>
        {activeDocumentId && (
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

      {entityDocFilter && (
        <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1">
          <span className="text-[10px] text-amber-400">
            Filtering docs by: <span className="font-medium">{entityDocFilter.label}</span>
          </span>
          <button
            type="button"
            onClick={() => setEntityDocFilter(null)}
            className="ml-2 text-[10px] text-amber-400/70 hover:text-amber-400"
          >
            ✕
          </button>
        </div>
      )}

      <EntityFilter
        activeTypes={activeTypes}
        onToggle={toggleType}
        search={search}
        onSearchChange={setSearch}
        showLowConf={showLowConf}
        onToggleLowConf={() => setShowLowConf((v) => !v)}
      />

      <div
        className="flex-1 space-y-1.5 overflow-y-auto pr-0.5"
        onMouseLeave={handleMouseLeave}
      >
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
