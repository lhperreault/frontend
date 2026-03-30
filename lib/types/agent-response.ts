export interface ProvenanceLink {
  section_id: string
  file_name: string
  document_type: string | null
  page_range: string | null
  quote_snippet: string | null   // first 200 chars of relevant section
}

export interface ToolCallSummary {
  tool_name: string
  args: Record<string, unknown>
  result_summary: string         // truncated to 300 chars
}

export interface AgentResponse {
  id: string
  case_id: string
  session_id: string
  query: string
  agent_name: string             // "complaint_agent", "contract_agent"
  answer: string
  confidence: number             // 0-1
  needs_review: boolean
  provenance_links: ProvenanceLink[]
  reasoning_steps: string[]
  tool_calls_made: ToolCallSummary[]
  created_at: string
}
