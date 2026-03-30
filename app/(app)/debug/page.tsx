"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface CaseRow {
  id: string
  case_name: string
  created_at: string
  doc_count: number
  section_count: number
  kg_node_count: number
}

export default function DebugPage() {
  const [cases, setCases] = useState<CaseRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      try {
        const { data: caseRows, error: casesErr } = await supabase
          .from("cases")
          .select("id, case_name, created_at")
          .order("created_at", { ascending: false })

        if (casesErr) throw new Error(casesErr.message)
        if (!caseRows?.length) {
          setCases([])
          setIsLoading(false)
          return
        }

        const enriched: CaseRow[] = await Promise.all(
          caseRows.map(async (c) => {
            const [docs, nodes] = await Promise.all([
              supabase.from("documents").select("id", { count: "exact", head: true }).eq("case_id", c.id),
              supabase.from("kg_nodes").select("id", { count: "exact", head: true }).eq("case_id", c.id),
            ])
            const docIds = (
              await supabase.from("documents").select("id").eq("case_id", c.id)
            ).data?.map((d) => d.id) ?? []

            const sections = docIds.length
              ? await supabase
                  .from("sections")
                  .select("id", { count: "exact", head: true })
                  .in("document_id", docIds)
              : { count: 0 }

            return {
              ...c,
              doc_count: docs.count ?? 0,
              section_count: sections.count ?? 0,
              kg_node_count: nodes.count ?? 0,
            }
          })
        )

        setCases(enriched)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error")
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-xl font-semibold">Debug — Supabase Data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify the Supabase connection and inspect existing data. Click a case to open its workspace.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Error: {error}
        </p>
      )}

      {!isLoading && !error && cases.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No cases found. Run the pipeline to populate data.
        </p>
      )}

      {cases.map((c) => (
        <button
          key={c.id}
          onClick={() => router.push(`/case/${c.id}/workspace`)}
          className="w-full rounded-xl border border-border bg-card px-5 py-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{c.case_name}</p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">{c.id}</p>
            </div>
            <time className="shrink-0 text-xs text-muted-foreground">
              {new Date(c.created_at).toLocaleDateString()}
            </time>
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <Stat label="documents" value={c.doc_count} />
            <Stat label="sections" value={c.section_count} />
            <Stat label="KG nodes" value={c.kg_node_count} />
          </div>
        </button>
      ))}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <span className={value === 0 ? "text-red-400" : "text-foreground font-medium"}>{value}</span>
      {" "}{label}
    </span>
  )
}
