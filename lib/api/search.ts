import { fetchAPI } from "./fetch"
import type { SearchResponse } from "@/lib/types/search-result"

interface SearchFilters {
  document_types?: string[]
  semantic_labels?: string[]
  document_ids?: string[]
  min_level?: number
  max_level?: number
}

export async function searchCase(
  caseId: string,
  query: string,
  filters?: SearchFilters,
  limit?: number,
  semanticWeight?: number,
): Promise<SearchResponse> {
  return fetchAPI<SearchResponse>("/api/search", {
    method: "POST",
    body: JSON.stringify({
      case_id: caseId,
      query,
      filters: filters ?? {},
      limit,
      semantic_weight: semanticWeight,
    }),
  })
}
