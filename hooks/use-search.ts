// @ts-nocheck
"use client"

import { useState, useCallback, useRef } from "react"
import { searchDocuments } from "@/lib/api/search"
import type { SearchResult } from "@/lib/types/search-result"

export function useSearch(caseId: string) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((query: string, debounceMs = 300) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    if (!query.trim()) {
      setResults([])
      return
    }

    debounceTimer.current = setTimeout(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await searchDocuments({ query, caseId })
        setResults(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed")
      } finally {
        setIsLoading(false)
      }
    }, debounceMs)
  }, [caseId])

  const clear = useCallback(() => setResults([]), [])

  return { search, results, isLoading, error, clear }
}
