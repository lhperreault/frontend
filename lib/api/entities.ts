import { fetchAPI } from "./fetch"
import type { KGNode, KGNodeType } from "@/lib/types/kg"

export async function getCaseEntities(
  caseId: string,
  nodeType?: KGNodeType,
): Promise<KGNode[]> {
  const url = nodeType
    ? `/api/case/${caseId}/entities?node_type=${encodeURIComponent(nodeType)}`
    : `/api/case/${caseId}/entities`
  return fetchAPI<KGNode[]>(url)
}
