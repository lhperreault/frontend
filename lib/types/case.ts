export interface Case {
  id: string                     // UUID
  case_name: string
  case_type: string | null       // "Breach of Contract", "Personal Injury", etc.
  next_deadline: string | null   // ISO date string
  pipeline_status: string | null // "idle" | "running" | "ready" | "error"
  created_at: string             // ISO timestamp
  // Case context fields (from Stage 2 backend work)
  party_role: "plaintiff" | "defendant" | "appellant" | "appellee" | null
  case_stage: "filing" | "discovery" | "motions" | "trial" | "appeal" | "closed" | null
  our_client: string | null
  opposing_party: string | null
  court_name: string | null
  judge_name: string | null
  case_context: string | null
  primary_document_id: string | null
}

export interface Document {
  id: string                     // UUID
  case_id: string                // FK → cases.id
  file_name: string              // stem, no extension
  document_type: string | null   // "Contract - NDA", "Pleading - Complaint", etc.
  confidence_score: number | null // 0-1 classification confidence
  total_pages: number | null
  parent_document_id: string | null // FK → documents.id (for exhibit children)
  tagged_xhtml_url: string | null   // Supabase Storage URL for tagged XHTML (HTML docs only)
  created_at: string
}
