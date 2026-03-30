export interface SearchScores {
  semantic: number
  keyword: number
  combined: number
}

export interface SearchProvenance {
  anchor_id: string | null
  is_synthetic: boolean
  start_page: number | null
  end_page: number | null
}

export interface SearchResult {
  section_id: string
  document_id: string
  file_name: string
  document_type: string | null
  section_title: string | null
  semantic_label: string | null
  level: number
  page_range: string | null
  parent_context: string | null
  section_text: string | null
  scores: SearchScores
  provenance: SearchProvenance
}

export interface SearchResponse {
  query: string
  case_id: string
  filters_applied: Record<string, unknown>
  results: SearchResult[]
  total_results: number
}
