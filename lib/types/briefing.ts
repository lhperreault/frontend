// ── Briefing Section IDs ─────────────────────────────────────────────────────

export type BriefingSectionId =
  | "case_metadata"
  | "parties_roles"
  | "governing_documents"
  | "contractual_provisions"
  | "obligations_duties"
  | "events_timeline"
  | "notice_cure"
  | "jurisdiction_forum"
  | "claims_counts"
  | "damages"
  | "evidence_inventory"
  | "sol_inputs"

// ── Shared Structural Types ──────────────────────────────────────────────────

export interface SectionGap {
  completeness: number      // 0–1
  missingFields: string[]
  suggestions: string[]
}

export interface SectionSummary {
  text: string
  confidence: number
  agentName: string
  createdAt: string
}

export interface BriefingFact {
  label: string
  value: string | null
  confidence?: number
  source?: string
  page?: string | null
}

export interface BriefingSection<T = unknown> {
  sectionId: BriefingSectionId
  title: string
  data: T | null
  summary: SectionSummary | null
  gap: SectionGap
}

// ── Section-Specific Data Shapes ─────────────────────────────────────────────

export interface CaseMetadataData {
  caseName: string
  caseType: string | null
  partyRole: string | null
  ourClient: string | null
  opposingParty: string | null
  courtName: string | null
  judgeName: string | null
  filingDate: string | null
  jurisdiction: string | null
}

export interface PartyEntry {
  label: string
  role: string | null
  aliases: string[]
  confidence: number
  instanceCount: number
}

export interface PartiesRolesData {
  parties: PartyEntry[]
  contracting_party_mismatch: boolean
}

export interface GoverningDocumentEntry {
  id: string
  fileName: string
  documentType: string | null
  totalPages: number | null
  confidenceScore: number | null
  executed: boolean | null
  effectiveDate: string | null
}

export interface GoverningDocumentsData {
  documents: GoverningDocumentEntry[]
}

export interface ClauseEntry {
  clauseType: string
  present: boolean
  quote: string | null
  documentId: string | null
  documentName: string | null
}

export interface ContractualProvisionsData {
  clauses: ClauseEntry[]
  governingLaw: string | null
  jurisdiction: string | null
  hasArbitration: boolean
  hasIndemnification: boolean
  hasLimitations: boolean
  hasVenueClause: boolean
}

export interface ObligationEntry {
  label: string
  obligor: string | null
  obligee: string | null
  triggerEvent: string | null
  dueDate: string | null
  confidence: number
}

export interface ObligationsDutiesData {
  obligations: ObligationEntry[]
}

export interface EventsTimelineData {
  eventCount: number
  earliestDate: string | null
  latestDate: string | null
}

export interface NoticeCureData {
  noticeRequired: boolean | null
  noticePeriodDays: number | null
  curePeriodDays: number | null
  noticeMethod: string | null
  noticeLetterFound: boolean
}

export type AdrVsLitigation = "adr" | "litigation" | "unclear" | null

export interface JurisdictionForumData {
  governingLaw: string | null
  jurisdiction: string | null
  arbitration: boolean
  arbitrationProvider: string | null
  venue: string | null
  adrVsLitigationInsight: AdrVsLitigation
}

export interface ClaimEntry {
  id: string
  label: string
  type: string | null
  summary: string | null
  confidence: number
  plaintiff: string | null
  defendant: string | null
}

export interface CountEntry {
  countNumber: number
  label: string
  type: string | null
  summary: string | null
}

export interface ClaimsCountsData {
  claims: ClaimEntry[]
  counts: CountEntry[]
}

export interface AmountEntry {
  label: string
  value: string | null
  amountType: string | null
  currency: string | null
  confidence: number
}

export interface DamagesData {
  amounts: AmountEntry[]
  totalClaimed: number | null
}

export interface EvidenceLinkEntry {
  reference: string
  type: string | null
  documentId: string | null
  documentName: string | null
}

export interface EvidenceInventoryData {
  documentCount: number
  documentsByType: Record<string, number>
  evidenceDensityScore: number
  evidenceLinks: EvidenceLinkEntry[]
}

export interface SolInputsData {
  accrualDate: string | null
  filingDate: string | null
  statuteOfLimitationsYears: number | null
  daysRemaining: number | null
  solBreached: boolean | null
  relevantDates: BriefingFact[]
}

// ── Top-level CaseBriefing ───────────────────────────────────────────────────

export interface CaseBriefingSections {
  case_metadata: BriefingSection<CaseMetadataData>
  parties_roles: BriefingSection<PartiesRolesData>
  governing_documents: BriefingSection<GoverningDocumentsData>
  contractual_provisions: BriefingSection<ContractualProvisionsData>
  obligations_duties: BriefingSection<ObligationsDutiesData>
  events_timeline: BriefingSection<EventsTimelineData>
  notice_cure: BriefingSection<NoticeCureData>
  jurisdiction_forum: BriefingSection<JurisdictionForumData>
  claims_counts: BriefingSection<ClaimsCountsData>
  damages: BriefingSection<DamagesData>
  evidence_inventory: BriefingSection<EvidenceInventoryData>
  sol_inputs: BriefingSection<SolInputsData>
}

export interface CaseBriefing {
  caseId: string
  generatedAt: string
  sections: CaseBriefingSections
  overallCompleteness: number
}
