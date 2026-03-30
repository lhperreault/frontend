"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, Calendar, Scale, AlertTriangle, ListTodo } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { BoardColumn } from "./board-column"
import type { BoardCardData } from "./board-card"
import type { KGNode } from "@/lib/types/kg"

interface ActionBoardProps {
  caseId: string
}

interface ColumnSet {
  keyFacts:    BoardCardData[]
  obligations: BoardCardData[]
  claims:      BoardCardData[]
  missing:     BoardCardData[]
}

function nodeToCard(
  node: KGNode,
  caseId: string,
  extra?: Partial<BoardCardData>,
): BoardCardData {
  return {
    id:         node.id,
    text:       node.node_label,
    confidence: (node.properties?.confidence as number) ?? 1,
    documentId: node.document_id ?? undefined,
    sectionId:  node.source_section_id ?? undefined,
    caseId,
    dateValue:  node.properties?.date_value as string | undefined,
    ...extra,
  }
}

const TODAY      = new Date()
const THIRTY_OUT = new Date(TODAY.getTime() + 30 * 24 * 60 * 60 * 1000)

function dueBadge(dateValue?: string): string | undefined {
  if (!dateValue) return undefined
  const d = new Date(dateValue)
  if (isNaN(d.getTime())) return undefined
  if (d < TODAY) return "Overdue"
  if (d < THIRTY_OUT) return "Due soon"
  return undefined
}

export function ActionBoard({ caseId }: ActionBoardProps) {
  const [cols, setCols]       = useState<ColumnSet | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = createClient()

        // Fetch claims, obligations, and evidence nodes in parallel
        const [claimsRes, obligationsRes, evidenceRes] = await Promise.all([
          supabase
            .from("kg_nodes")
            .select("*")
            .eq("case_id", caseId)
            .eq("node_type", "claim"),
          supabase
            .from("kg_nodes")
            .select("*")
            .eq("case_id", caseId)
            .eq("node_type", "obligation"),
          supabase
            .from("kg_nodes")
            .select("*")
            .eq("case_id", caseId)
            .eq("node_type", "evidence")
            .limit(30),
        ])

        const claims      = (claimsRes.data ?? []) as KGNode[]
        const obligations = (obligationsRes.data ?? []) as KGNode[]
        // Key facts = high-confidence evidence nodes
        const keyFacts    = ((evidenceRes.data ?? []) as KGNode[]).filter(
          (n) => ((n.properties?.confidence as number) ?? 1) >= 0.8,
        )

        // Single edge query to find how many supported_by edges each claim has
        const evidenceCountByClaimId = new Map<string, number>()
        if (claims.length > 0) {
          const { data: edges } = await supabase
            .from("kg_edges")
            .select("target_node_id")
            .in("target_node_id", claims.map((c) => c.id))
            .eq("edge_type", "supported_by")

          for (const e of edges ?? []) {
            evidenceCountByClaimId.set(
              e.target_node_id,
              (evidenceCountByClaimId.get(e.target_node_id) ?? 0) + 1,
            )
          }
        }

        const supportedIds   = new Set(evidenceCountByClaimId.keys())
        const unsupportedClaims = claims.filter((c) => !supportedIds.has(c.id))

        if (!cancelled) {
          setCols({
            keyFacts: keyFacts.map((n) => nodeToCard(n, caseId)),
            obligations: obligations.map((n) =>
              nodeToCard(n, caseId, {
                badge: dueBadge(n.properties?.date_value as string | undefined),
              }),
            ),
            claims: claims.map((n) =>
              nodeToCard(n, caseId, {
                evidenceCount: evidenceCountByClaimId.get(n.id) ?? 0,
              }),
            ),
            missing: unsupportedClaims.map((n) =>
              nodeToCard(n, caseId, { badge: "No evidence" }),
            ),
          })
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load board")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [caseId])

  if (isLoading) {
    return (
      <div className="flex h-full gap-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="glass h-full min-w-[13rem] animate-pulse rounded-xl" />
        ))}
      </div>
    )
  }

  if (error) return <p className="p-4 text-sm text-red-400">{error}</p>

  const COLUMNS = [
    {
      title:     "Key Facts",
      Icon:      CheckCircle2,
      cards:     cols?.keyFacts ?? [],
      emptyNote: "No verified facts yet — review extractions to populate",
    },
    {
      title:     "Obligations",
      Icon:      Calendar,
      cards:     cols?.obligations ?? [],
      emptyNote: "No obligations extracted",
    },
    {
      title:     "Claims",
      Icon:      Scale,
      cards:     cols?.claims ?? [],
      emptyNote: "No claims identified",
    },
    {
      title:     "Missing Info",
      Icon:      AlertTriangle,
      cards:     cols?.missing ?? [],
      emptyNote: "No gaps detected — all claims have evidence",
    },
    {
      title:     "Action Items",
      Icon:      ListTodo,
      cards:     [] as BoardCardData[],
      emptyNote: "Pin items from chat to populate",
    },
  ]

  return (
    <div className="flex h-full gap-3 overflow-x-auto p-4">
      {COLUMNS.map((col) => (
        <BoardColumn
          key={col.title}
          title={col.title}
          Icon={col.Icon}
          cards={col.cards}
          emptyNote={col.emptyNote}
        />
      ))}
    </div>
  )
}
