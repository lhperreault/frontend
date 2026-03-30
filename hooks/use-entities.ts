"use client"

import { useState, useEffect, useCallback } from "react"
import { getCaseEntities } from "@/lib/api/entities"
import type { KGNode, KGNodeGrouped, NodeType } from "@/lib/types/kg"

export function useEntities(caseId: string, type?: NodeType) {
  const [entities, setEntities] = useState<KGNodeGrouped[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntities = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getCaseEntities(caseId, type)

      // Group by canonical_node_id:
      // - Nodes where canonical_node_id === null are the primary (canonical) nodes
      // - Nodes where canonical_node_id is set are duplicates pointing to their canonical
      const instancesByCanonical = new Map<string, KGNode[]>()
      const canonicals: KGNode[] = []

      for (const node of data) {
        if (node.canonical_node_id) {
          const list = instancesByCanonical.get(node.canonical_node_id) ?? []
          list.push(node)
          instancesByCanonical.set(node.canonical_node_id, list)
        } else {
          canonicals.push(node)
        }
      }

      const grouped: KGNodeGrouped[] = canonicals.map((node) => ({
        ...node,
        instances: instancesByCanonical.get(node.id) ?? [],
      }))

      // Edge case: if a node references a canonical not in this batch, include it standalone
      const canonicalIds = new Set(canonicals.map((n) => n.id))
      for (const node of data) {
        if (node.canonical_node_id && !canonicalIds.has(node.canonical_node_id)) {
          grouped.push({ ...node, instances: [] })
        }
      }

      setEntities(grouped)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entities")
    } finally {
      setIsLoading(false)
    }
  }, [caseId, type])

  useEffect(() => { fetchEntities() }, [fetchEntities])

  return { entities, isLoading, error, refetch: fetchEntities }
}
