"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Document } from "@/lib/types/case"
import type { Section } from "@/lib/types/section"
import type { Extraction } from "@/lib/types/extraction"

interface UseDocumentResult {
  document: Document | null
  sections: Section[]
  extractions: Extraction[]
  isLoading: boolean
  error: string | null
}

/**
 * Fetches a single document's metadata, sections, and extractions.
 * Uses the browser Supabase client directly (no route handler needed).
 */
export function useDocument(documentId: string | null): UseDocumentResult {
  const [document, setDocument] = useState<Document | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [extractions, setExtractions] = useState<Extraction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!documentId) {
      setDocument(null)
      setSections([])
      setExtractions([])
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    async function load() {
      try {
        const [docRes, secRes, extRes] = await Promise.all([
          supabase.from("documents").select("*").eq("id", documentId).single(),
          supabase
            .from("sections")
            .select("*")
            .eq("document_id", documentId)
            .order("start_page", { ascending: true })
            .order("level", { ascending: true }),
          supabase.from("extractions").select("*").eq("document_id", documentId),
        ])

        if (cancelled) return

        if (docRes.error) throw new Error(docRes.error.message)
        setDocument(docRes.data as Document)
        setSections((secRes.data ?? []) as Section[])
        setExtractions((extRes.data ?? []) as Extraction[])
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load document")
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [documentId])

  return { document, sections, extractions, isLoading, error }
}
