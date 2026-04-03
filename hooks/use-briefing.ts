"use client"

import { useState, useEffect, useCallback } from "react"
import { getCaseBriefing, getCaseBriefingV2 } from "@/lib/api/briefing"
import type { CaseBriefing } from "@/lib/types/briefing"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useBriefing(caseId: string): { briefing: any; isLoading: boolean; error: string | null; refetch: () => void } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [briefing, setBriefing] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getCaseBriefing(caseId)
      setBriefing(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load briefing")
    } finally {
      setIsLoading(false)
    }
  }, [caseId])

  useEffect(() => { fetch() }, [fetch])

  return { briefing, isLoading, error, refetch: fetch }
}

export function useBriefingV2(caseId: string): { briefing: CaseBriefing | null; isLoading: boolean; error: string | null; refetch: () => void } {
  const [briefing, setBriefing] = useState<CaseBriefing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getCaseBriefingV2(caseId)
      setBriefing(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load briefing")
    } finally {
      setIsLoading(false)
    }
  }, [caseId])

  useEffect(() => { load() }, [load])

  return { briefing, isLoading, error, refetch: load }
}
