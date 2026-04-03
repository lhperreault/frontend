import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import type { CountWithEvidence, Allegation, LegalElement, EvidenceLink } from "@/lib/types/counts"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await params
  const supabase = createServerClient()

  // 1. Fetch all counts for this case
  const { data: counts, error: countsErr } = await supabase
    .from("counts")
    .select("id, count_number, count_label, count_type, summary, document_id, section_id")
    .eq("case_id", caseId)
    .order("count_number", { ascending: true })

  if (countsErr) {
    return NextResponse.json({ error: countsErr.message }, { status: 500 })
  }
  if (!counts || counts.length === 0) {
    return NextResponse.json([])
  }

  // Deduplicate counts — if the same document is uploaded more than once,
  // claims/counts with identical label+type will appear multiple times.
  const seenCountKeys = new Set<string>()
  const uniqueCounts = counts.filter((c) => {
    const key = `${(c.count_label as string ?? "").toLowerCase().trim()}||${(c.count_type as string ?? "").toLowerCase().trim()}`
    if (seenCountKeys.has(key)) return false
    seenCountKeys.add(key)
    return true
  })

  const countIds = uniqueCounts.map((c) => c.id as string)

  // 2. Fetch all allegations belonging to these counts
  const { data: allegations } = await supabase
    .from("allegations")
    .select("id, allegation_number, allegation_text, section_id, count_id")
    .in("count_id", countIds)
    .order("allegation_number", { ascending: true })

  // 3. Fetch all legal elements belonging to these counts
  const { data: elements } = await supabase
    .from("legal_elements")
    .select("id, element_label, element_text, section_id, count_id")
    .in("count_id", countIds)

  // 4. Collect all IDs for the evidence_links query
  const allegationIds = (allegations ?? []).map((a) => a.id as string)
  const elementIds    = (elements ?? []).map((e) => e.id as string)

  // 5. Fetch evidence_links for counts, allegations, and elements in one go
  let evidenceLinks: EvidenceLink[] = []
  if (countIds.length || allegationIds.length || elementIds.length) {
    // Supabase doesn't support multi-column OR with .in() in a single query,
    // so we fetch three slices and merge. Keep request count low by only
    // running the slices that have IDs.
    const linkSelects = "id, link_type, relationship, confidence_score, evidence_document_id, evidence_section_id, evidence_reference, evidence_snippet, evidence_page, allegation_id, element_id, count_id"

    const [countLinks, allegLinks, elemLinks] = await Promise.all([
      supabase
        .from("evidence_links")
        .select(linkSelects)
        .in("count_id", countIds),
      allegationIds.length
        ? supabase.from("evidence_links").select(linkSelects).in("allegation_id", allegationIds)
        : Promise.resolve({ data: [] }),
      elementIds.length
        ? supabase.from("evidence_links").select(linkSelects).in("element_id", elementIds)
        : Promise.resolve({ data: [] }),
    ])

    const rawLinks = [
      ...(countLinks.data ?? []),
      ...(allegLinks.data ?? []),
      ...(elemLinks.data ?? []),
    ]

    // 6. Resolve document names for the links that have evidence_document_id
    const evidenceDocIds = Array.from(
      new Set(rawLinks.map((l) => l.evidence_document_id).filter(Boolean) as string[])
    )

    let docNameMap = new Map<string, string>()
    if (evidenceDocIds.length) {
      const { data: evidenceDocs } = await supabase
        .from("documents")
        .select("id, file_name")
        .in("id", evidenceDocIds)
      for (const d of evidenceDocs ?? []) {
        docNameMap.set(d.id as string, d.file_name as string)
      }
    }

    evidenceLinks = rawLinks.map((l) => ({
      ...l,
      evidence_document_name: l.evidence_document_id
        ? (docNameMap.get(l.evidence_document_id) ?? null)
        : null,
    })) as EvidenceLink[]
  }

  // 7. Group everything by count
  const result: CountWithEvidence[] = uniqueCounts.map((count) => {
    const countAllegations: Allegation[] = (allegations ?? [])
      .filter((a) => a.count_id === count.id)
      .map((a) => ({
        id: a.id as string,
        allegation_number: a.allegation_number as number | null,
        allegation_text: a.allegation_text as string,
        section_id: a.section_id as string | null,
        evidence_links: evidenceLinks.filter((l) => l.allegation_id === a.id),
      }))

    const countElements: LegalElement[] = (elements ?? [])
      .filter((e) => e.count_id === count.id)
      .map((e) => ({
        id: e.id as string,
        element_label: e.element_label as string,
        element_text: e.element_text as string | null,
        section_id: e.section_id as string | null,
        evidence_links: evidenceLinks.filter((l) => l.element_id === e.id),
      }))

    return {
      id: count.id as string,
      count_number: count.count_number as number,
      count_label: count.count_label as string,
      count_type: count.count_type as string | null,
      summary: count.summary as string | null,
      document_id: count.document_id as string | null,
      section_id: count.section_id as string | null,
      allegations: countAllegations,
      elements: countElements,
      evidence_links: evidenceLinks.filter((l) => l.count_id === count.id),
    }
  })

  return NextResponse.json(result)
}
