import { fetchAPI } from "./fetch"
import type { TimelineEvent } from "@/lib/types/timeline-event"

export async function getCaseTimeline(
  caseId: string,
  partyFilter?: string,
): Promise<TimelineEvent[]> {
  const url = partyFilter
    ? `/api/case/${caseId}/timeline?party_filter=${encodeURIComponent(partyFilter)}`
    : `/api/case/${caseId}/timeline`
  return fetchAPI<TimelineEvent[]>(url)
}
