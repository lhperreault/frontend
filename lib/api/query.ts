import { fetchAPI } from "./fetch"
import type { AgentResponse } from "@/lib/types/agent-response"

export async function queryAgent(
  caseId: string,
  query: string,
  sessionId?: string,
): Promise<AgentResponse> {
  return fetchAPI<AgentResponse>("/api/query", {
    method: "POST",
    body: JSON.stringify({ case_id: caseId, query, session_id: sessionId }),
  })
}
