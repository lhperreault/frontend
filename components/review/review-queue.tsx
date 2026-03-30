"use client"

import { useReviewQueue } from "@/hooks/use-review-queue"
import { ReviewItem } from "./review-item"

interface ReviewQueueProps {
  caseId: string
}

export function ReviewQueue({ caseId }: ReviewQueueProps) {
  const { items, isLoading, error, review } = useReviewQueue(caseId)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Review Queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Low-confidence extractions sorted by confidence score.
          </p>
        </div>
        {!isLoading && (
          <span className="glass rounded-lg px-3 py-1.5 text-sm font-medium">
            {items.length} pending
          </span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass h-32 animate-pulse rounded-xl" />
          ))}
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!isLoading && !error && items.length === 0 && (
        <div className="flex flex-col items-center gap-2 pt-16">
          <p className="text-sm font-medium text-muted-foreground">All caught up</p>
          <p className="text-xs text-muted-foreground">No extractions pending review.</p>
        </div>
      )}
      <div className="space-y-3">
        {items.map(item => (
          <ReviewItem key={item.id} item={item} onReview={review} />
        ))}
      </div>
    </div>
  )
}
