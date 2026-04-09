// Rich data model for the Count-centric Case Board view.
// Mirrors the Phase A Supabase schema: claims → counts → (legal_elements, allegations,
// affirmative_defenses, evidence_links) plus the cross-count legal_theories grouping.

export type ElementSource =
  | "extracted"
  | "inferred_from_schema"
  | "needs_schema_inference"

export type AllegationType = "factual" | "legal_conclusion" | "damages"

export interface LegalElementRow {
  id: string
  count_id: string
  element_number: number | null
  element_text: string
  element_source: ElementSource
  legal_standard: string | null
  confidence: number
}

export interface AllegationRow {
  id: string
  count_id: string | null
  claim_id: string | null
  allegation_number: number | null
  allegation_text: string
  allegation_type: AllegationType
  supporting_element_id: string | null
  confidence: number
}

export interface EvidenceLinkRow {
  id: string
  allegation_id: string | null
  count_id: string | null
  evidence_reference: string
  evidence_type: string | null
}

export interface AffirmativeDefenseRow {
  id: string
  count_id: string
  defense_number: number | null
  defense_label: string
  defense_text: string | null
  defense_source: string
  elements: string[] | null
  confidence: number
}

export interface CountRow {
  id: string
  claim_id: string
  count_number: number | null
  count_label: string
  count_type: string | null
  summary: string | null
  confidence: number
  needs_review: boolean | null
}

export interface ClaimRow {
  id: string
  case_id: string
  claim_type: string | null
  claim_label: string | null
  plaintiff: string | null
  defendant: string | null
  summary: string | null
  confidence: number
  needs_review: boolean | null
}

export interface LegalTheoryRow {
  id: string
  theory_label: string
  theory_type: string | null
  summary: string | null
  confidence: number
  count_ids: string[]
}

// ── Assembled view models ────────────────────────────────────────────────────

export type ElementStatus = "proven" | "partial" | "gap" | "disputed"

export interface ElementView extends LegalElementRow {
  status: ElementStatus
  strength: number            // 0-1, derived from supporting allegation count + confidence
  supportingAllegations: AllegationRow[]
  evidenceCount: number
}

export interface CountView {
  count: CountRow
  elements: ElementView[]
  allegations: AllegationRow[]
  defenses: AffirmativeDefenseRow[]
  evidenceLinks: EvidenceLinkRow[]
  gapCount: number
  overallStrength: number     // 0-1, averaged across elements
}

export interface ClaimView {
  claim: ClaimRow
  counts: CountView[]
}

export interface AgentResponseRow {
  id: string
  case_id: string
  count_id: string | null
  element_id: string | null
  agent_name: string | null
  query: string | null
  answer: string | null
  confidence: number | null
  needs_review: boolean | null
  reasoning_steps: unknown
  provenance_links: unknown
  created_at: string
}

export interface CaseBoardData {
  claims: ClaimView[]
  theories: LegalTheoryRow[]
  // Flat list of every count in display order (for the stepper)
  flatCounts: { claim: ClaimRow; count: CountRow }[]
  // Count-id -> unlinked allegations (supporting_element_id IS NULL)
  unlinkedByCount: Record<string, AllegationRow[]>
  // Agent responses keyed by count (best-effort — case-wide rows land under a null bucket)
  agentResponsesByCount: Record<string, AgentResponseRow[]>
}
