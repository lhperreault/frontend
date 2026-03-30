"use client"

import { useState, useEffect } from "react"

interface UseDocumentXhtmlResult {
  xhtml: string | null
  isLoading: boolean
  error: string | null
}

/**
 * Fetches the tagged XHTML content from a Supabase Storage URL.
 * Only fetches if the URL is non-null. Used by LightboxViewer for HTML documents.
 */
export function useDocumentXhtml(url: string | null | undefined): UseDocumentXhtmlResult {
  const [xhtml, setXhtml] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url) {
      setXhtml(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch XHTML: ${res.status} ${res.statusText}`)
        return res.text()
      })
      .then((text) => {
        if (!cancelled) setXhtml(text)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load document")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [url])

  return { xhtml, isLoading, error }
}
