import { fetchAPI } from "./fetch"
import type { KGNode, KGEdge } from "@/lib/types/kg"

export async function getCaseGraph(
  caseId: string,
): Promise<{ nodes: KGNode[]; edges: KGEdge[] }> {
  return fetchAPI<{ nodes: KGNode[]; edges: KGEdge[] }>(`/api/case/${caseId}/graph`)
}
