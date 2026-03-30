// @ts-nocheck
"use client"

import { useState, useEffect, useCallback } from "react"
import { submitReview } from "@/lib/api/reviews"
import { createClient } from "@/lib/supabase/client"
import type { PendingReview, ReviewAction } from "@/lib/types/review"

export function useReviewQueue(caseId: string) {
  const [items, setItems] = useState<PendingReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: sbErr } = await supabase
        .from("extractions")
        .select("*")
        .eq("case_id", caseId)
        .lt("confidence", 0.7)
        .order("confidence", { ascending: true })
      if (sbErr) throw new Error(sbErr.message)
      setItems(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load review queue")
    } finally {
      setIsLoading(false)
    }
  }, [caseId])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  const review = useCallback(async (extractionId: string, action: ReviewAction, notes?: string) => {
    await submitReview(extractionId, action, notes)
    setItems(prev => prev.filter(i => i.id !== extractionId))
  }, [])

  return { items, isLoading, error, review, refetch: fetchQueue }
}
