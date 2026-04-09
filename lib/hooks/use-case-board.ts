"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type {
  AffirmativeDefenseRow,
  AgentResponseRow,
  AllegationRow,
  CaseBoardData,
  ClaimRow,
  ClaimView,
  CountRow,
  CountView,
  ElementStatus,
  ElementView,
  EvidenceLinkRow,
  LegalElementRow,
  LegalTheoryRow,
} from "@/lib/types/case-board"

// Derive a coarse element status from supporting allegation count + confidence.
function deriveStatus(supportCount: number, avgConfidence: number): ElementStatus {
  if (supportCount === 0) return "gap"
  if (supportCount === 1 || avgConfidence < 0.55) return "partial"
  return "proven"
}

function strengthFromAllegations(allegs: AllegationRow[]): number {
  if (allegs.length === 0) return 0
  const avg =
    allegs.reduce((sum, a) => sum + (a.confidence ?? 0.7), 0) / allegs.length
  // Scale by how many allegations back it; cap at 1.
  const volumeBoost = Math.min(allegs.length / 3, 1)
  return Math.min(avg * (0.6 + 0.4 * volumeBoost), 1)
}

export interface UseCaseBoardResult {
  data: CaseBoardData | null
  isLoading: boolean
  error: string | null
  refetch: () => void
  attachAllegationToElement: (
    allegationId: string,
    elementId: string,
  ) => Promise<void>
}

export function useCaseBoard(caseId: string): UseCaseBoardResult {
  const [data, setData] = useState<CaseBoardData | null>(null)
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    const sb = createClient()

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [claimsRes, countsRes] = await Promise.all([
          sb
            .from("claims")
            .select(
              "id, case_id, claim_type, claim_label, plaintiff, defendant, summary, confidence, needs_review",
            )
            .eq("case_id", caseId),
          sb
            .from("counts")
            .select(
              "id, claim_id, count_number, count_label, count_type, summary, confidence, needs_review",
            )
            .eq("case_id", caseId),
        ])

        if (claimsRes.error) throw claimsRes.error
        if (countsRes.error) throw countsRes.error

        const claims = (claimsRes.data ?? []) as ClaimRow[]
        const counts = (countsRes.data ?? []) as CountRow[]
        const countIds = counts.map((c) => c.id)

        // Fetch dependent rows in parallel, scoped to these counts.
        const [
          elementsRes,
          allegationsRes,
          defensesRes,
          evidenceRes,
          theoriesRes,
          agentsRes,
        ] = await Promise.all([
          countIds.length
            ? sb.from("legal_elements").select("*").in("count_id", countIds)
            : Promise.resolve({ data: [], error: null }),
          countIds.length
            ? sb.from("allegations").select("*").in("count_id", countIds)
            : Promise.resolve({ data: [], error: null }),
          countIds.length
            ? sb.from("affirmative_defenses").select("*").in("count_id", countIds)
            : Promise.resolve({ data: [], error: null }),
          countIds.length
            ? sb.from("evidence_links").select("*").in("count_id", countIds)
            : Promise.resolve({ data: [], error: null }),
          sb
            .from("legal_theories")
            .select("id, theory_label, theory_type, summary, confidence")
            .eq("case_id", caseId),
          sb
            .from("agent_responses")
            .select(
              "id, case_id, count_id, element_id, agent_name, query, answer, confidence, needs_review, reasoning_steps, provenance_links, created_at",
            )
            .eq("case_id", caseId)
            .order("created_at", { ascending: false })
            .limit(100),
        ])

        const elements = (elementsRes.data ?? []) as LegalElementRow[]
        const allegations = (allegationsRes.data ?? []) as AllegationRow[]
        const defenses = (defensesRes.data ?? []) as AffirmativeDefenseRow[]
        const evidenceLinks = (evidenceRes.data ?? []) as EvidenceLinkRow[]
        const theoriesRaw =
          (theoriesRes.data ?? []) as Omit<LegalTheoryRow, "count_ids">[]

        // Load theory → count links in a second round (small table).
        let theories: LegalTheoryRow[] = []
        if (theoriesRaw.length) {
          const { data: tcRows } = await sb
            .from("theory_counts")
            .select("theory_id, count_id")
            .in(
              "theory_id",
              theoriesRaw.map((t) => t.id),
            )
          const byTheory = new Map<string, string[]>()
          for (const row of tcRows ?? []) {
            const arr = byTheory.get(row.theory_id) ?? []
            arr.push(row.count_id)
            byTheory.set(row.theory_id, arr)
          }
          theories = theoriesRaw.map((t) => ({
            ...t,
            count_ids: byTheory.get(t.id) ?? [],
          }))
        }

        // Index helpers
        const elementsByCount = new Map<string, LegalElementRow[]>()
        for (const el of elements) {
          const arr = elementsByCount.get(el.count_id) ?? []
          arr.push(el)
          elementsByCount.set(el.count_id, arr)
        }
        const allegationsByCount = new Map<string, AllegationRow[]>()
        for (const al of allegations) {
          if (!al.count_id) continue
          const arr = allegationsByCount.get(al.count_id) ?? []
          arr.push(al)
          allegationsByCount.set(al.count_id, arr)
        }
        const defensesByCount = new Map<string, AffirmativeDefenseRow[]>()
        for (const d of defenses) {
          const arr = defensesByCount.get(d.count_id) ?? []
          arr.push(d)
          defensesByCount.set(d.count_id, arr)
        }
        const evidenceByAlleg = new Map<string, EvidenceLinkRow[]>()
        const evidenceByCount = new Map<string, EvidenceLinkRow[]>()
        for (const ev of evidenceLinks) {
          if (ev.allegation_id) {
            const arr = evidenceByAlleg.get(ev.allegation_id) ?? []
            arr.push(ev)
            evidenceByAlleg.set(ev.allegation_id, arr)
          }
          if (ev.count_id) {
            const arr = evidenceByCount.get(ev.count_id) ?? []
            arr.push(ev)
            evidenceByCount.set(ev.count_id, arr)
          }
        }

        // Assemble CountView per count
        const countViews = new Map<string, CountView>()
        for (const count of counts) {
          const countAllegs = allegationsByCount.get(count.id) ?? []
          const countElements = (elementsByCount.get(count.id) ?? []).sort(
            (a, b) => (a.element_number ?? 99) - (b.element_number ?? 99),
          )

          const elementViews: ElementView[] = countElements.map((el) => {
            const supporting = countAllegs.filter(
              (a) => a.supporting_element_id === el.id,
            )
            const evidenceCount = supporting.reduce(
              (n, a) => n + (evidenceByAlleg.get(a.id)?.length ?? 0),
              0,
            )
            const strength = strengthFromAllegations(supporting)
            const avgConf =
              supporting.length === 0
                ? 0
                : supporting.reduce((s, a) => s + (a.confidence ?? 0.7), 0) /
                  supporting.length
            return {
              ...el,
              status: deriveStatus(supporting.length, avgConf),
              strength,
              supportingAllegations: supporting,
              evidenceCount,
            }
          })

          const gapCount = elementViews.filter((e) => e.status === "gap").length
          const overallStrength =
            elementViews.length === 0
              ? 0
              : elementViews.reduce((s, e) => s + e.strength, 0) /
                elementViews.length

          countViews.set(count.id, {
            count,
            elements: elementViews,
            allegations: countAllegs,
            defenses: (defensesByCount.get(count.id) ?? []).sort(
              (a, b) => (a.defense_number ?? 99) - (b.defense_number ?? 99),
            ),
            evidenceLinks: evidenceByCount.get(count.id) ?? [],
            gapCount,
            overallStrength,
          })
        }

        // Group counts under their claims, preserving count_number order
        const claimsById = new Map<string, ClaimRow>()
        for (const c of claims) claimsById.set(c.id, c)

        const claimViews: ClaimView[] = claims.map((claim) => {
          const cvs = counts
            .filter((c) => c.claim_id === claim.id)
            .sort(
              (a, b) => (a.count_number ?? 999) - (b.count_number ?? 999),
            )
            .map((c) => countViews.get(c.id)!)
            .filter(Boolean)
          return { claim, counts: cvs }
        })

        const flatCounts: { claim: ClaimRow; count: CountRow }[] = []
        for (const cv of claimViews) {
          for (const c of cv.counts) {
            flatCounts.push({ claim: cv.claim, count: c.count })
          }
        }

        // Unlinked allegations per count (supporting_element_id IS NULL)
        const unlinkedByCount: Record<string, AllegationRow[]> = {}
        for (const cid of countIds) unlinkedByCount[cid] = []
        for (const al of allegations) {
          if (al.count_id && al.supporting_element_id == null) {
            const bucket = unlinkedByCount[al.count_id] ?? []
            bucket.push(al)
            unlinkedByCount[al.count_id] = bucket
          }
        }

        // Agent responses keyed by count (empty bucket "" for case-wide rows with null count_id)
        const agentRows = (agentsRes.data ?? []) as AgentResponseRow[]
        const agentResponsesByCount: Record<string, AgentResponseRow[]> = {}
        for (const row of agentRows) {
          const key = row.count_id ?? ""
          const bucket = agentResponsesByCount[key] ?? []
          bucket.push(row)
          agentResponsesByCount[key] = bucket
        }

        if (!cancelled) {
          setData({
            claims: claimViews,
            theories,
            flatCounts,
            unlinkedByCount,
            agentResponsesByCount,
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load board")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [caseId, nonce])

  const attachAllegationToElement = async (
    allegationId: string,
    elementId: string,
  ) => {
    const sb = createClient()
    const { error: updateErr } = await sb
      .from("allegations")
      .update({ supporting_element_id: elementId })
      .eq("id", allegationId)
    if (updateErr) {
      setError(updateErr.message)
      return
    }
    setNonce((n) => n + 1)
  }

  return {
    data,
    isLoading,
    error,
    refetch: () => setNonce((n) => n + 1),
    attachAllegationToElement,
  }
}
