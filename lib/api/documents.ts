import { fetchAPI } from "./fetch"
import type { Document } from "@/lib/types/case"

export async function getCaseDocuments(caseId: string): Promise<Document[]> {
  return fetchAPI<Document[]>(`/api/case/${caseId}/documents`)
}
