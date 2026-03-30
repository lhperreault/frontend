// @ts-nocheck
"use client"

import { useState, useEffect, useCallback } from "react"
import { getCaseBriefing } from "@/lib/api/briefing"
import type { ChecklistRun } from "@/lib/types/checklist"

export function useBriefing(caseId: string) {
  const [briefing, setBriefing] = useState<ChecklistRun | null>(null)
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
