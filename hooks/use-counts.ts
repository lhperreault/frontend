"use client"

import { useState, useEffect, useCallback } from "react"
import type { CountWithEvidence } from "@/lib/types/counts"

export interface CountEdits {
  count_label?: string
  count_type?: string | null
  summary?: string | null
}

interface UseCountsResult {
  counts: CountWithEvidence[]
  isLoading: boolean
  error: string | null
  refetch: () => void
  updateCount: (countId: string, edits: CountEdits) => Promise<void>
  dismissCount: (countId: string) => Promise<void>
}

export function useCounts(caseId: string): UseCountsResult {
  const [counts, setCounts] = useState<CountWithEvidence[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetch(`/api/case/${caseId}/counts`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: CountWithEvidence[]) => {
        if (!cancelled) setCounts(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load counts")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [caseId, tick])

  // Optimistic update: apply edits locally, then PATCH. Revert on failure.
  const updateCount = useCallback(async (countId: string, edits: CountEdits) => {
    const prev = counts
    setCounts((cs) =>
      cs.map((c) => (c.id === countId ? { ...c, ...edits } : c))
    )
    try {
      const res = await fetch(`/api/case/${caseId}/counts/${countId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits),
      })
      if (!res.ok) throw new Error(await res.text())
    } catch {
      setCounts(prev)
      throw new Error("Failed to save changes")
    }
  }, [caseId, counts])

  // Optimistic dismiss: remove locally, then DELETE. Revert on failure.
  const dismissCount = useCallback(async (countId: string) => {
    const prev = counts
    setCounts((cs) => cs.filter((c) => c.id !== countId))
    try {
      const res = await fetch(`/api/case/${caseId}/counts/${countId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error(await res.text())
    } catch {
      setCounts(prev)
      throw new Error("Failed to remove count")
    }
  }, [caseId, counts])

  return {
    counts,
    isLoading,
    error,
    refetch: () => setTick((t) => t + 1),
    updateCount,
    dismissCount,
  }
}
