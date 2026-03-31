"use client"

import { useState, useEffect } from "react"
import type { CountWithEvidence } from "@/lib/types/counts"

interface UseCountsResult {
  counts: CountWithEvidence[]
  isLoading: boolean
  error: string | null
  refetch: () => void
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

  return { counts, isLoading, error, refetch: () => setTick((t) => t + 1) }
}
