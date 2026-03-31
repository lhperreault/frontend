import { fetchAPI } from "./fetch"
import type { AgentResponse } from "@/lib/types/agent-response"

export async function queryAgent(params: {
  caseId: string
  question: string
  sessionId?: string
  conversationHistory?: Array<{ role: string; content: string }>
}): Promise<AgentResponse> {
  return fetchAPI<AgentResponse>("/api/query", {
    method: "POST",
    body: JSON.stringify({
      case_id:    params.caseId,
      query:      params.question,
      session_id: params.sessionId,
    }),
  })
}
