import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import type {
  CaseBriefing,
  CaseBriefingSections,
  BriefingSection,
  BriefingSectionId,
  SectionGap,
  SectionSummary,
  CaseMetadataData,
  PartiesRolesData,
  PartyEntry,
  GoverningDocumentsData,
  ContractualProvisionsData,
  ClauseEntry,
  ObligationsDutiesData,
  EventsTimelineData,
  NoticeCureData,
  JurisdictionForumData,
  ClaimsCountsData,
  DamagesData,
  EvidenceInventoryData,
  SolInputsData,
  BriefingFact,
} from "@/lib/types/briefing"

// ── Gap analysis ─────────────────────────────────────────────────────────────

const EXPECTED_FIELDS: Record<BriefingSectionId, number> = {
  case_metadata: 7,
  parties_roles: 3,
  governing_documents: 3,
  contractual_provisions: 5,
  obligations_duties: 2,
  events_timeline: 2,
  notice_cure: 4,
  jurisdiction_forum: 4,
  claims_counts: 2,
  damages: 2,
  evidence_inventory: 3,
  sol_inputs: 4,
}

function computeGap(sectionId: BriefingSectionId, presentFields: number): SectionGap {
  const total = EXPECTED_FIELDS[sectionId]
  const completeness = Math.min(presentFields / total, 1)

  const suggestions: Record<BriefingSectionId, string[]> = {
    case_metadata: ["Add court and judge info to the case details"],
    parties_roles: ["Upload the complaint or contract to identify parties"],
    governing_documents: ["Upload governing contracts or operative pleadings"],
    contractual_provisions: ["Upload an executed copy of the governing contract to extract clauses"],
    obligations_duties: ["Upload the contract — obligation clauses will be extracted automatically"],
    events_timeline: ["Upload dated correspondence or pleadings to build the timeline"],
    notice_cure: ["Upload the notice letter and contract notice provisions"],
    jurisdiction_forum: ["Upload the governing contract — forum selection clause required"],
    claims_counts: ["Upload the operative complaint to extract causes of action"],
    damages: ["Upload the complaint's prayer for relief or any settlement demand letter"],
    evidence_inventory: ["Upload supporting documents: emails, invoices, correspondence"],
    sol_inputs: ["Identify the accrual date — required to calculate the SOL countdown"],
  }

  const missingHints: Record<BriefingSectionId, string[]> = {
    case_metadata: ["court", "judge", "filing_date", "jurisdiction"],
    parties_roles: ["parties", "roles", "entity_types"],
    governing_documents: ["contracts", "execution_status", "effective_dates"],
    contractual_provisions: ["governing_law", "venue", "arbitration", "indemnification", "limitations"],
    obligations_duties: ["obligations", "deadlines"],
    events_timeline: ["events", "dates"],
    notice_cure: ["notice_method", "notice_period", "cure_period", "notice_letter"],
    jurisdiction_forum: ["governing_law", "jurisdiction", "arbitration", "venue"],
    claims_counts: ["claims", "counts"],
    damages: ["amounts", "total_claimed"],
    evidence_inventory: ["documents", "evidence_links", "density_score"],
    sol_inputs: ["accrual_date", "filing_date", "sol_years", "days_remaining"],
  }

  const missing = completeness < 1 ? missingHints[sectionId].slice(0, Math.ceil((total - presentFields))) : []

  return {
    completeness,
    missingFields: missing,
    suggestions: completeness < 0.8 ? suggestions[sectionId] : [],
  }
}

function makeSection<T>(
  sectionId: BriefingSectionId,
  title: string,
  data: T | null,
  presentFields: number,
  summary: SectionSummary | null,
): BriefingSection<T> {
  return {
    sectionId,
    title,
    data,
    summary,
    gap: computeGap(sectionId, presentFields),
  }
}

// ── Builder functions ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCaseMetadata(caseRow: Record<string, any>): { data: CaseMetadataData; present: number } {
  const data: CaseMetadataData = {
    caseName: (caseRow.case_name as string) ?? "",
    caseType: (caseRow.case_type as string | null) ?? null,
    partyRole: (caseRow.party_role as string | null) ?? null,
    ourClient: (caseRow.our_client as string | null) ?? null,
    opposingParty: (caseRow.opposing_party as string | null) ?? null,
    courtName: (caseRow.court_name as string | null) ?? null,
    judgeName: (caseRow.judge_name as string | null) ?? null,
    filingDate: null,
    jurisdiction: null,
  }
  const present = [
    data.caseName,
    data.caseType,
    data.partyRole ?? data.ourClient,
    data.opposingParty,
    data.courtName,
    data.judgeName,
    data.filingDate ?? data.jurisdiction,
  ].filter(Boolean).length
  return { data, present }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPartiesSection(nodes: any[]): { data: PartiesRolesData; present: number } {
  const partyNodes = nodes.filter((n) => n.node_type === "party")
  if (partyNodes.length === 0) return { data: { parties: [], contracting_party_mismatch: false }, present: 0 }

  // Group by canonical_node_id
  const groups = new Map<string, typeof partyNodes>()
  for (const n of partyNodes) {
    const key = (n.canonical_node_id as string | null) ?? (n.id as string)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(n)
  }

  const parties: PartyEntry[] = []
  let mismatch = false

  for (const group of groups.values()) {
    const primary = group[0]
    const props = (primary.properties as Record<string, unknown>) ?? {}
    const aliases = group.slice(1).map((n) => n.node_label as string)
    const isSignatory = props.is_signatory as boolean | undefined
    const hasSignatoryConflict = group.some((n) => {
      const p = (n.properties as Record<string, unknown>) ?? {}
      return p.is_signatory === false && p.referenced_as_signatory === true
    })
    if (hasSignatoryConflict) mismatch = true

    parties.push({
      label: primary.node_label as string,
      role: (props.role as string | null) ?? (props.party_type as string | null) ?? null,
      aliases,
      confidence: (primary.confidence as number | null) ?? (props.confidence as number | null) ?? 0.8,
      instanceCount: group.length,
    })
    void isSignatory
  }

  const present = [
    parties.length > 0,
    parties.some((p) => p.role),
    parties.some((p) => p.aliases.length > 0 || p.instanceCount > 1),
  ].filter(Boolean).length

  return { data: { parties, contracting_party_mismatch: mismatch }, present }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDocumentsSection(documents: any[]): { data: GoverningDocumentsData; present: number } {
  const docs = documents.map((d) => {
    const ci = (d.clause_indicators as Record<string, unknown> | null) ?? {}
    return {
      id: d.id as string,
      fileName: d.file_name as string,
      documentType: (d.document_type as string | null) ?? null,
      totalPages: (d.total_pages as number | null) ?? null,
      confidenceScore: (d.confidence_score as number | null) ?? null,
      executed: (ci.signature_blocks as boolean | null) ?? null,
      effectiveDate: (ci.effective_date as string | null) ?? null,
    }
  })
  const present = [
    docs.length > 0,
    docs.some((d) => d.documentType),
    docs.some((d) => d.executed !== null || d.effectiveDate),
  ].filter(Boolean).length
  return { data: { documents: docs }, present }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildProvisionsSection(documents: any[]): { data: ContractualProvisionsData; present: number } {
  if (documents.length === 0) {
    return {
      data: {
        clauses: [],
        governingLaw: null,
        jurisdiction: null,
        hasArbitration: false,
        hasIndemnification: false,
        hasLimitations: false,
        hasVenueClause: false,
      },
      present: 0,
    }
  }

  // Use highest-confidence document
  const sorted = [...documents].sort(
    (a, b) => ((b.confidence_score as number) ?? 0) - ((a.confidence_score as number) ?? 0),
  )
  const primary = sorted[0]
  const ci = (primary.clause_indicators as Record<string, unknown> | null) ?? {}

  const CLAUSE_KEYS = [
    "governingLaw",
    "jurisdiction",
    "arbitration",
    "venue",
    "limitations",
    "indemnification",
    "confidentiality",
    "termination",
    "noticePeriod",
    "curePeriod",
    "forcemajeure",
    "assignment",
  ]

  const clauses: ClauseEntry[] = CLAUSE_KEYS.map((key) => {
    const val = ci[key]
    return {
      clauseType: key,
      present: !!val,
      quote: typeof val === "string" ? val : null,
      documentId: primary.id as string,
      documentName: primary.file_name as string,
    }
  })

  const governingLaw = typeof ci.governingLaw === "string" ? ci.governingLaw : null
  const jurisdiction = typeof ci.jurisdiction === "string" ? ci.jurisdiction : null
  const hasArbitration = !!(ci.arbitration)
  const hasIndemnification = !!(ci.indemnification)
  const hasLimitations = !!(ci.limitations)
  const hasVenueClause = !!(ci.venue)

  const present = [governingLaw, jurisdiction, hasArbitration || hasVenueClause, hasLimitations, hasIndemnification]
    .filter(Boolean).length

  return {
    data: { clauses, governingLaw, jurisdiction, hasArbitration, hasIndemnification, hasLimitations, hasVenueClause },
    present,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildObligationsSection(nodes: any[], extractions: any[]): { data: ObligationsDutiesData; present: number } {
  const obligationNodes = nodes.filter((n) => n.node_type === "obligation")
  const obligationExtractions = extractions.filter((e) => e.extraction_type === "obligation")

  const seen = new Set<string>()
  const obligations = []

  for (const n of obligationNodes) {
    const props = (n.properties as Record<string, unknown>) ?? {}
    const label = n.node_label as string
    const key = label.toLowerCase().trim()
    if (seen.has(key)) continue
    seen.add(key)
    obligations.push({
      label,
      obligor: (props.obligor as string | null) ?? null,
      obligee: (props.obligee as string | null) ?? null,
      triggerEvent: (props.trigger_event as string | null) ?? null,
      dueDate: (props.due_date as string | null) ?? (props.date_value as string | null) ?? null,
      confidence: (props.confidence as number | null) ?? 0.7,
    })
  }

  for (const e of obligationExtractions) {
    const label = (e.entity_name as string) ?? ""
    const key = label.toLowerCase().trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    const props = (e.properties as Record<string, unknown>) ?? {}
    obligations.push({
      label,
      obligor: (props.obligor as string | null) ?? null,
      obligee: (props.obligee as string | null) ?? null,
      triggerEvent: null,
      dueDate: (props.due_date as string | null) ?? null,
      confidence: (e.confidence as number | null) ?? 0.6,
    })
  }

  const present = [obligations.length > 0, obligations.some((o) => o.dueDate)].filter(Boolean).length
  return { data: { obligations }, present }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildEventsSection(nodes: any[]): { data: EventsTimelineData; present: number } {
  const events = nodes.filter((n) => n.node_type === "event" || n.node_type === "procedural_event")
  const dates = events
    .map((e) => {
      const props = (e.properties as Record<string, unknown>) ?? {}
      return (props.date_sort_key as string | null) ?? (props.date_value as string | null)
    })
    .filter(Boolean) as string[]

  dates.sort()
  const earliest = dates[0] ?? null
  const latest = dates[dates.length - 1] ?? null
  const present = [events.length > 0, earliest !== null].filter(Boolean).length
  return { data: { eventCount: events.length, earliestDate: earliest, latestDate: latest }, present }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildNoticeCureSection(documents: any[], extractions: any[]): { data: NoticeCureData; present: number } {
  // Try to get notice info from clause_indicators or obligation extractions
  const noticeExtractions = extractions.filter(
    (e) => e.extraction_type === "obligation" && (e.entity_name as string ?? "").toLowerCase().includes("notice"),
  )
  const hasNoticeLetter = documents.some((d) =>
    ((d.document_type as string | null) ?? "").toLowerCase().includes("notice"),
  )

  // Pull cure/notice period from clause_indicators
  let noticePeriodDays: number | null = null
  let curePeriodDays: number | null = null
  let noticeMethod: string | null = null
  let noticeRequired: boolean | null = null

  for (const doc of documents) {
    const ci = (doc.clause_indicators as Record<string, unknown> | null) ?? {}
    if (ci.noticePeriod) {
      noticeRequired = true
      if (typeof ci.noticePeriod === "number") noticePeriodDays = ci.noticePeriod
      else if (typeof ci.noticePeriod === "string") {
        const match = ci.noticePeriod.match(/\d+/)
        if (match) noticePeriodDays = parseInt(match[0])
        noticeMethod = ci.noticePeriod
      }
    }
    if (ci.curePeriod) {
      if (typeof ci.curePeriod === "number") curePeriodDays = ci.curePeriod
      else if (typeof ci.curePeriod === "string") {
        const match = ci.curePeriod.match(/\d+/)
        if (match) curePeriodDays = parseInt(match[0])
      }
    }
  }

  if (noticeExtractions.length > 0) noticeRequired = true

  const present = [noticeRequired !== null, noticePeriodDays !== null, curePeriodDays !== null, hasNoticeLetter]
    .filter(Boolean).length
  return { data: { noticeRequired, noticePeriodDays, curePeriodDays, noticeMethod, noticeLetterFound: hasNoticeLetter }, present }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildJurisdictionSection(documents: any[]): { data: JurisdictionForumData; present: number } {
  if (documents.length === 0) {
    return {
      data: { governingLaw: null, jurisdiction: null, arbitration: false, arbitrationProvider: null, venue: null, adrVsLitigationInsight: null },
      present: 0,
    }
  }

  const sorted = [...documents].sort(
    (a, b) => ((b.confidence_score as number) ?? 0) - ((a.confidence_score as number) ?? 0),
  )

  let governingLaw: string | null = null
  let jurisdiction: string | null = null
  let arbitration = false
  let arbitrationProvider: string | null = null
  let venue: string | null = null

  for (const doc of sorted) {
    const ci = (doc.clause_indicators as Record<string, unknown> | null) ?? {}
    if (!governingLaw && ci.governingLaw) governingLaw = typeof ci.governingLaw === "string" ? ci.governingLaw : "Present"
    if (!jurisdiction && ci.jurisdiction) jurisdiction = typeof ci.jurisdiction === "string" ? ci.jurisdiction : "Present"
    if (!arbitration && ci.arbitration) {
      arbitration = true
      arbitrationProvider = typeof ci.arbitrationProvider === "string" ? ci.arbitrationProvider : null
    }
    if (!venue && ci.venue) venue = typeof ci.venue === "string" ? ci.venue : "Present"
  }

  const adrVsLitigationInsight = arbitration ? "adr" : (jurisdiction || governingLaw) ? "litigation" : "unclear"

  const present = [governingLaw, jurisdiction, arbitration || venue, adrVsLitigationInsight !== "unclear"].filter(Boolean).length
  return { data: { governingLaw, jurisdiction, arbitration, arbitrationProvider, venue, adrVsLitigationInsight }, present }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildClaimsSection(claimsRows: any[], countsRows: any[]): { data: ClaimsCountsData; present: number } {
  const claims = claimsRows.map((c) => ({
    id: c.id as string,
    label: (c.claim_label as string) ?? (c.claim_type as string) ?? "Unknown Claim",
    type: (c.claim_type as string | null) ?? null,
    summary: (c.summary as string | null) ?? null,
    confidence: (c.confidence as number | null) ?? 0.7,
    plaintiff: (c.plaintiff as string | null) ?? null,
    defendant: (c.defendant as string | null) ?? null,
  }))

  const seenCounts = new Set<string>()
  const counts = countsRows
    .filter((c) => {
      const key = `${(c.count_label as string ?? "").toLowerCase().trim()}||${(c.count_type as string ?? "").toLowerCase().trim()}`
      if (seenCounts.has(key)) return false
      seenCounts.add(key)
      return true
    })
    .map((c) => ({
      countNumber: c.count_number as number,
      label: c.count_label as string,
      type: (c.count_type as string | null) ?? null,
      summary: (c.summary as string | null) ?? null,
    }))

  const present = [claims.length > 0, counts.length > 0].filter(Boolean).length
  return { data: { claims, counts }, present }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDamagesSection(nodes: any[], extractions: any[]): { data: DamagesData; present: number } {
  const amountNodes = nodes.filter((n) => n.node_type === "amount")
  const amountExtractions = extractions.filter((e) => e.extraction_type === "amount")

  const seen = new Set<string>()
  const amounts = []

  for (const n of amountNodes) {
    const props = (n.properties as Record<string, unknown>) ?? {}
    const label = n.node_label as string
    const key = label.toLowerCase().trim()
    if (seen.has(key)) continue
    seen.add(key)
    amounts.push({
      label,
      value: (props.amount_value as string | null) ?? (props.entity_value as string | null) ?? null,
      amountType: (props.amount_type as string | null) ?? null,
      currency: (props.currency as string | null) ?? "USD",
      confidence: (props.confidence as number | null) ?? 0.7,
    })
  }

  for (const e of amountExtractions) {
    const label = e.entity_name as string
    const key = label.toLowerCase().trim()
    if (seen.has(key)) continue
    seen.add(key)
    const props = (e.properties as Record<string, unknown>) ?? {}
    amounts.push({
      label,
      value: (e.entity_value as string | null) ?? null,
      amountType: (props.amount_type as string | null) ?? null,
      currency: (props.currency as string | null) ?? "USD",
      confidence: (e.confidence as number | null) ?? 0.6,
    })
  }

  // Try summing numeric values
  let totalClaimed: number | null = null
  for (const a of amounts) {
    if (!a.value) continue
    const num = parseFloat(a.value.replace(/[^0-9.]/g, ""))
    if (!isNaN(num)) {
      totalClaimed = (totalClaimed ?? 0) + num
    }
  }

  const present = [amounts.length > 0, totalClaimed !== null].filter(Boolean).length
  return { data: { amounts, totalClaimed }, present }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildEvidenceSection(documents: any[], evidenceLinks: any[], totalClaimsAndCounts: number): { data: EvidenceInventoryData; present: number } {
  const byType: Record<string, number> = {}
  for (const d of documents) {
    const t = (d.document_type as string | null) ?? "Unknown"
    byType[t] = (byType[t] ?? 0) + 1
  }

  const linkEntries = evidenceLinks.map((l) => ({
    reference: (l.evidence_reference as string) ?? "Unknown",
    type: (l.evidence_type as string | null) ?? (l.link_type as string | null) ?? null,
    documentId: (l.evidence_document_id as string | null) ?? null,
    documentName: null as string | null,
  }))

  const densityScore = Math.min(linkEntries.length / Math.max(totalClaimsAndCounts, 1), 1)

  const present = [documents.length > 0, linkEntries.length > 0, densityScore > 0].filter(Boolean).length
  return {
    data: { documentCount: documents.length, documentsByType: byType, evidenceDensityScore: densityScore, evidenceLinks: linkEntries },
    present,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSolSection(extractions: any[], caseRow: Record<string, any>, documents: any[]): { data: SolInputsData; present: number } {
  const dateExtractions = extractions.filter((e) => e.extraction_type === "date")

  let accrualDate: string | null = null
  let filingDate: string | null = null
  const relevantDates: BriefingFact[] = []

  for (const e of dateExtractions) {
    const props = (e.properties as Record<string, unknown>) ?? {}
    const subtype = (props.date_subtype as string | null) ?? ""
    const val = (e.entity_value as string | null) ?? (e.entity_name as string | null) ?? null

    if (!accrualDate && subtype.includes("accrual")) accrualDate = val
    if (!filingDate && subtype.includes("filing")) filingDate = val

    if (val) {
      relevantDates.push({
        label: (e.entity_name as string) || subtype || "Date",
        value: val,
        confidence: (e.confidence as number | null) ?? undefined,
      })
    }
  }

  // Try to get filing date from case row
  if (!filingDate && caseRow.created_at) filingDate = caseRow.created_at as string

  // Try to get SOL years from clause_indicators
  let statuteOfLimitationsYears: number | null = null
  for (const doc of documents) {
    const ci = (doc.clause_indicators as Record<string, unknown> | null) ?? {}
    if (ci.limitationsPeriod) {
      if (typeof ci.limitationsPeriod === "number") { statuteOfLimitationsYears = ci.limitationsPeriod; break }
      if (typeof ci.limitationsPeriod === "string") {
        const match = ci.limitationsPeriod.match(/\d+/)
        if (match) { statuteOfLimitationsYears = parseInt(match[0]); break }
      }
    }
  }

  let daysRemaining: number | null = null
  let solBreached: boolean | null = null

  if (accrualDate && statuteOfLimitationsYears) {
    const accrual = new Date(accrualDate)
    const deadline = new Date(accrual)
    deadline.setFullYear(deadline.getFullYear() + statuteOfLimitationsYears)
    const today = new Date()
    const diffMs = deadline.getTime() - today.getTime()
    daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    solBreached = daysRemaining < 0
  }

  const present = [accrualDate, filingDate, statuteOfLimitationsYears, daysRemaining !== null].filter(Boolean).length
  return { data: { accrualDate, filingDate, statuteOfLimitationsYears, daysRemaining, solBreached, relevantDates }, present }
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
): Promise<NextResponse<CaseBriefing | { error: string }>> {
  const { caseId } = await params
  const supabase = createServerClient()

  // Q1 — anchor: case row
  const { data: caseRow, error: caseErr } = await supabase
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .single()

  if (caseErr || !caseRow) {
    return NextResponse.json({ error: caseErr?.message ?? "Case not found" }, { status: 500 })
  }

  // Q2–Q8 in parallel
  const [
    { data: documents },
    { data: kgNodes },
    { data: extractions },
    { data: claimsRows },
    { data: countsRows },
    { data: agentResponses },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("id, file_name, document_type, confidence_score, total_pages, clause_indicators, created_at")
      .eq("case_id", caseId),
    supabase.from("kg_nodes").select("*").eq("case_id", caseId),
    supabase.from("extractions").select("*").eq("case_id", caseId),
    supabase.from("claims").select("*").eq("case_id", caseId),
    supabase.from("counts").select("id, count_number, count_label, count_type, summary").eq("case_id", caseId).order("count_number", { ascending: true }),
    supabase
      .from("agent_responses")
      .select("agent_name, answer, confidence, created_at")
      .eq("case_id", caseId)
      .in("agent_name", [
        "briefing_metadata_agent",
        "briefing_parties_agent",
        "briefing_provisions_agent",
        "briefing_obligations_agent",
        "briefing_jurisdiction_agent",
        "briefing_claims_agent",
        "briefing_damages_agent",
        "briefing_evidence_agent",
        "briefing_sol_agent",
      ])
      .order("created_at", { ascending: false }),
  ])

  const docs = documents ?? []
  const nodes = kgNodes ?? []
  const exts = extractions ?? []
  const claims = claimsRows ?? []
  const counts = countsRows ?? []

  // Q7 — evidence_links (depends on counts)
  const countIds = counts.map((c) => c.id as string)
  let evidenceLinks: Record<string, unknown>[] = []
  if (countIds.length > 0) {
    const { data: links } = await supabase
      .from("evidence_links")
      .select("evidence_reference, evidence_type, evidence_document_id, link_type, count_id, allegation_id")
      .in("count_id", countIds)
    evidenceLinks = links ?? []
  }

  // Build summary map: agentName → latest SectionSummary
  const summaryMap = new Map<string, SectionSummary>()
  for (const r of agentResponses ?? []) {
    const name = r.agent_name as string
    if (!summaryMap.has(name)) {
      summaryMap.set(name, {
        text: r.answer as string,
        confidence: r.confidence as number,
        agentName: name,
        createdAt: r.created_at as string,
      })
    }
  }

  const totalClaimsAndCounts = claims.length + counts.length

  // Build each section
  const meta = buildCaseMetadata(caseRow as Record<string, unknown>)
  const parties = buildPartiesSection(nodes)
  const govDocs = buildDocumentsSection(docs)
  const provisions = buildProvisionsSection(docs)
  const obligations = buildObligationsSection(nodes, exts)
  const events = buildEventsSection(nodes)
  const noticeCure = buildNoticeCureSection(docs, exts)
  const jurisdiction = buildJurisdictionSection(docs)
  const claimsData = buildClaimsSection(claims, counts)
  const damages = buildDamagesSection(nodes, exts)
  const evidence = buildEvidenceSection(docs, evidenceLinks, totalClaimsAndCounts)
  const sol = buildSolSection(exts, caseRow as Record<string, unknown>, docs)

  const sections: CaseBriefingSections = {
    case_metadata: makeSection("case_metadata", "Case Metadata", meta.data, meta.present, summaryMap.get("briefing_metadata_agent") ?? null),
    parties_roles: makeSection("parties_roles", "Parties & Roles", parties.data, parties.present, summaryMap.get("briefing_parties_agent") ?? null),
    governing_documents: makeSection("governing_documents", "Governing Documents", govDocs.data, govDocs.present, null),
    contractual_provisions: makeSection("contractual_provisions", "Contractual Provisions", provisions.data, provisions.present, summaryMap.get("briefing_provisions_agent") ?? null),
    obligations_duties: makeSection("obligations_duties", "Obligations & Duties", obligations.data, obligations.present, summaryMap.get("briefing_obligations_agent") ?? null),
    events_timeline: makeSection("events_timeline", "Events & Timeline", events.data, events.present, null),
    notice_cure: makeSection("notice_cure", "Notice & Cure Mechanics", noticeCure.data, noticeCure.present, null),
    jurisdiction_forum: makeSection("jurisdiction_forum", "Jurisdiction & Forum", jurisdiction.data, jurisdiction.present, summaryMap.get("briefing_jurisdiction_agent") ?? null),
    claims_counts: makeSection("claims_counts", "Claims & Counts", claimsData.data, claimsData.present, summaryMap.get("briefing_claims_agent") ?? null),
    damages: makeSection("damages", "Damages", damages.data, damages.present, summaryMap.get("briefing_damages_agent") ?? null),
    evidence_inventory: makeSection("evidence_inventory", "Evidence Inventory", evidence.data, evidence.present, summaryMap.get("briefing_evidence_agent") ?? null),
    sol_inputs: makeSection("sol_inputs", "Statute of Limitations", sol.data, sol.present, summaryMap.get("briefing_sol_agent") ?? null),
  }

  const overallCompleteness =
    Object.values(sections).reduce((sum, s) => sum + s.gap.completeness, 0) / 12

  const briefing: CaseBriefing = {
    caseId,
    generatedAt: new Date().toISOString(),
    sections,
    overallCompleteness,
  }

  return NextResponse.json(briefing)
}
