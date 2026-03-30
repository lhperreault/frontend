import type { AgentResponse } from "./agent-response"

export interface ChecklistTask {
  id: string                     // "parties", "claims", "evidence_map", etc.
  question: string
  agent: string                  // "complaint_agent", "contract_agent", "cross_doc_agent"
  status: "pending" | "running" | "complete" | "error"
  result: AgentResponse | null   // populated after agent completes
}

export interface ChecklistTemplate {
  template_name: string          // "Breach of Contract"
  tasks: Omit<ChecklistTask, "status" | "result">[]
}
