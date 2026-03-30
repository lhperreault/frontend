export interface Section {
  id: string
  document_id: string
  section_title: string | null
  section_text: string
  level: number                  // hierarchy depth, 0 = root
  page_range: string | null      // "5-6"
  start_page: number | null
  end_page: number | null
  is_synthetic: boolean
  anchor_id: string | null       // HTML element ID for deep-linking
  parent_section_id: string | null
  semantic_label: string | null  // "obligation.payment", "causes_of_action.fraud"
  semantic_confidence: number | null
  label_source: string | null    // "pattern" or "gpt-4o-mini"
}
