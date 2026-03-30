"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Document } from "@/lib/types/case"

/**
 * Shows the 5 most recently uploaded documents across all cases.
 * Uses Supabase Realtime to update when new documents are inserted.
 */
export function InboundStream() {
  const [docs, setDocs] = useState<Document[]>([])

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setDocs((data ?? []) as Document[]))

    const channel = supabase
      .channel("inbound-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "documents" },
        (payload) => {
          setDocs((prev) => [payload.new as Document, ...prev].slice(0, 5))
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (!docs.length) return null

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Recently Added
      </p>
      <ul className="space-y-1">
        {docs.map((doc) => (
          <li
            key={doc.id}
            className="glass flex items-center gap-3 rounded-lg px-3 py-2 text-xs"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
            <span className="truncate text-foreground/80">{doc.file_name}</span>
            {doc.document_type && (
              <span className="ml-auto shrink-0 text-muted-foreground">{doc.document_type}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
