export type ExtractionType =
  | "party"
  | "date"
  | "amount"
  | "obligation"
  | "claim"
  | "condition"
  | "evidence_ref"
  | "case_citation"

export interface Extraction {
  id: string
  section_id: string
  document_id: string
  extraction_type: ExtractionType
  entity_name: string            // "Acme Corp", "breach of fiduciary duty"
  entity_value: string | null    // normalized: ISO date, numeric amount
  properties: Record<string, unknown> // type-specific: plaintiff, defendant, trigger_event, etc.
  confidence: number             // 0-1
  page_range: string | null
}
