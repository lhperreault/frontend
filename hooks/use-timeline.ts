"use client"

import { useState, useEffect, useCallback } from "react"
import { getCaseTimeline } from "@/lib/api/timeline"
import type { TimelineEvent } from "@/lib/types/timeline-event"

export function useTimeline(caseId: string) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [filtered, setFiltered] = useState<TimelineEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeTravelDate, setTimeTravelDate] = useState<Date | null>(null)
  const [partyFilter, setPartyFilter] = useState<string>("")

  // Re-fetch when caseId or partyFilter changes
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getCaseTimeline(caseId, partyFilter || undefined)
      setEvents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load timeline")
    } finally {
      setIsLoading(false)
    }
  }, [caseId, partyFilter])

  useEffect(() => { fetchData() }, [fetchData])

  // Re-apply date filter whenever raw events or timeTravelDate change
  useEffect(() => {
    if (!timeTravelDate) {
      setFiltered(events)
      return
    }
    setFiltered(
      events.filter((e) => {
        if (!e.date_sort_key) return true
        const d = new Date(e.date_sort_key)
        return !isNaN(d.getTime()) && d <= timeTravelDate
      }),
    )
  }, [events, timeTravelDate])

  const filterToDate = useCallback((date: Date | null) => {
    setTimeTravelDate(date)
  }, [])

  return {
    events: filtered,
    allEvents: events,
    isLoading,
    error,
    timeTravelDate,
    filterToDate,
    partyFilter,
    setPartyFilter,
    refetch: fetchData,
  }
}
