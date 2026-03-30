import { fetchAPI } from "./fetch"
import type { ChecklistTask } from "@/lib/types/checklist"

export async function getCaseBriefing(caseId: string): Promise<ChecklistTask[]> {
  return fetchAPI<ChecklistTask[]>(`/api/case/${caseId}/briefing`)
}
