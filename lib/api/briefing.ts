import { fetchAPI } from "./fetch"
import type { ChecklistTask } from "@/lib/types/checklist"
import type { CaseBriefing } from "@/lib/types/briefing"

export async function getCaseBriefing(caseId: string): Promise<ChecklistTask[]> {
  return fetchAPI<ChecklistTask[]>(`/api/case/${caseId}/briefing`)
}

export async function getCaseBriefingV2(caseId: string): Promise<CaseBriefing> {
  return fetchAPI<CaseBriefing>(`/api/case/${caseId}/briefing-v2`)
}
