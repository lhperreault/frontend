export type ReviewAction = "approved" | "corrected" | "rejected"

export interface Review {
  id: string
  agent_response_id: string
  reviewer_id: string | null
  review_action: ReviewAction
  correction_text: string | null
  correction_notes: string | null
  reviewed_at: string
}

/**
 * PendingReview — a low-confidence extraction awaiting human-in-the-loop review.
 * Mirrors the shape returned by the extractions table for items with confidence < 0.7.
 */
export interface PendingReview {
  id: string
  confidence: number
  entityName: string
  entityValue?: string | null
  extractionType: string
  sectionText?: string | null
  documentName?: string | null
}
