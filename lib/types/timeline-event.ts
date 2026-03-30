export interface TimelineEvent {
  date_value: string             // ISO date or descriptive string
  date_sort_key: string          // for sorting
  event_label: string
  event_type: "event" | "procedural_event"
  node_id: string
  involved_parties: string[]
  source_section_id: string | null
  source_document_id: string | null
  confidence: number
  is_relative: boolean
  reference_event: string | null
  properties: Record<string, unknown>
}
