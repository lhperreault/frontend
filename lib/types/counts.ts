export interface EvidenceLink {
  id: string
  link_type: "explicit_citation" | "agent_discovered"
  relationship: "supports" | "contradicts" | "unknown"
  confidence_score: number
  evidence_document_id: string | null
  evidence_document_name: string | null  // joined from documents
  evidence_section_id: string | null
  evidence_reference: string | null      // "Exhibit A", "[Semantic match: ...]"
  evidence_snippet: string | null
  evidence_page: string | null
  // which item this link belongs to
  allegation_id: string | null
  element_id: string | null
  count_id: string | null
}

export interface Allegation {
  id: string
  allegation_number: number | null
  allegation_text: string
  section_id: string | null
  evidence_links: EvidenceLink[]
}

export interface LegalElement {
  id: string
  element_label: string
  element_text: string | null
  section_id: string | null
  evidence_links: EvidenceLink[]
}

export interface CountWithEvidence {
  id: string
  count_number: number
  count_label: string
  count_type: string | null
  summary: string | null
  document_id: string | null
  section_id: string | null
  allegations: Allegation[]
  elements: LegalElement[]
  evidence_links: EvidenceLink[]  // links directly on the count itself
}
