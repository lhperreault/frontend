"use client"

import { useState, useEffect, useCallback } from "react"
import { getCaseGraph } from "@/lib/api/graph"
import type { KGNode, KGEdge } from "@/lib/types/kg"

type KGGraph = { nodes: KGNode[]; edges: KGEdge[] }

export function useGraph(caseId: string) {
  const [graph, setGraph] = useState<KGGraph | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadGraph = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getCaseGraph(caseId)
      setGraph(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load graph")
    } finally {
      setIsLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    loadGraph()
  }, [loadGraph])

  return { graph, isLoading, error, refetch: loadGraph }
}
