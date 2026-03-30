import { fetchAPI } from "./fetch"
import type { Review, ReviewAction } from "@/lib/types/review"

export async function submitReview(
  agentResponseId: string,
  action: ReviewAction,
  correctionText?: string,
  correctionNotes?: string,
): Promise<Review> {
  return fetchAPI<Review>("/api/reviews", {
    method: "POST",
    body: JSON.stringify({
      agent_response_id: agentResponseId,
      review_action: action,
      correction_text: correctionText,
      correction_notes: correctionNotes,
    }),
  })
}
